import { useState } from 'react';
import type { HeaderBanner } from '@api/headerBanners';
import { resolveAssetUrl } from '@api/fileAssets';
import fallback from '@assets/greenmall-banner.png';
import styles from './HeaderAdvertisement.module.css';

export default function HeaderAdvertisement({ banner }: { banner: HeaderBanner | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = banner?.asset?.url ? resolveAssetUrl(banner.asset.url) : null;
  const useCampaign = Boolean(url && url !== failedUrl);
  const image = <img src={useCampaign ? url! : fallback} alt="" draggable={false}
    onError={useCampaign ? () => setFailedUrl(url) : undefined} />;
  return useCampaign && banner?.linkUrl ? (
    <a className={styles.banner} href={banner.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={banner.title}>{image}</a>
  ) : <div className={styles.banner} role="img" aria-label={useCampaign ? banner?.title : 'GreenMall — покупки, отдых, впечатления'}>{image}</div>;
}
