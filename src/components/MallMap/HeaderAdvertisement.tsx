import { useState } from 'react';
import type { HeaderBanner } from '@api/headerBanners';
import { resolveAssetUrl } from '@api/fileAssets';
import fallback from '@assets/greenmall-banner-wide.png';
import styles from './HeaderAdvertisement.module.css';

export default function HeaderAdvertisement({ banner }: { banner: HeaderBanner | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = banner?.asset?.url ? resolveAssetUrl(banner.asset.url) : null;
  const useCampaign = Boolean(url && url !== failedUrl);
  const image = useCampaign ? <img src={url!} alt="" draggable={false}
    onError={() => setFailedUrl(url)} /> : (
    // The generated canvas includes white presentation margins. The viewport
    // selects the complete green creative, without clipping text or objects.
    <svg viewBox="0 250 2172 234" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true">
      <image href={fallback} width="2172" height="724" />
    </svg>
  );
  return useCampaign && banner?.linkUrl ? (
    <a className={styles.banner} href={banner.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={banner.title}>{image}</a>
  ) : <div className={styles.banner} role="img" aria-label={useCampaign ? banner?.title : 'GreenMall — покупки, отдых, впечатления'}>{image}</div>;
}
