import { useEffect, useState } from 'react';
import { resolveAssetUrl } from '@api/fileAssets';
import { fetchPublicAd, trackAdEvent } from '@api/publicAds';
import type { PublicAd } from '@api/types';
import styles from '@styles/MallMap.module.css';

interface PublicAdBannerProps {
  slotCode: string;
  onAdClick?: (ad: PublicAd['ad']) => void;
}

export default function PublicAdBanner({
  slotCode,
  onAdClick,
}: PublicAdBannerProps) {
  const [ad, setAd] = useState<PublicAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAd() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublicAd(slotCode);
        if (!cancelled) {
          setAd(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load ad');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAd();
    return () => {
      cancelled = true;
    };
  }, [slotCode]);

  useEffect(() => {
    if (!ad?.ad) return;

    trackAdEvent({
      campaignId: ad.ad.campaignId,
      slotCode,
      eventType: 'AD_IMPRESSION',
      source: 'MOBILE',
      creativeId: ad.ad.creative.id,
    });
  }, [ad, slotCode]);

  if (!ad || loading || error) return null;
  if (!ad.ad) return null;

  const selectedAd = ad.ad;
  const creative = selectedAd.creative;
  const imageUrl = creative.asset.url
    ? resolveAssetUrl(creative.asset.url)
    : null;

  const handleClick = () => {
    trackAdEvent({
      campaignId: selectedAd.campaignId,
      slotCode,
      eventType: 'AD_CLICK',
      source: 'MOBILE',
      creativeId: creative.id,
    });
    if (selectedAd.target.url) {
      window.open(selectedAd.target.url, '_blank', 'noopener,noreferrer');
    }
    if (onAdClick) {
      onAdClick(selectedAd);
    }
  };

  return (
    <div className={styles.mobileAdBanner} onClick={handleClick} role="button" tabIndex={0}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={creative.title || 'Объявление'}
          className={styles.mobileAdBannerImage}
        />
      ) : (
        <div className={styles.mobileAdBannerPlaceholder}>
          {creative.title || 'Объявление'}
          {creative.ctaText ? ` — ${creative.ctaText}` : ''}
        </div>
      )}
    </div>
  );
}
