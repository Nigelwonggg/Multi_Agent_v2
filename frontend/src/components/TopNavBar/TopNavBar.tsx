import React from 'react';
import { useLocation } from 'react-router-dom';
import SmoothLink from '../SmoothLink/SmoothLink';
import './TopNavBar.css';

interface TopNavBarProps {
  basePath?: string;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ basePath = '/vector-database' }) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isSettingsPage =
    location.pathname.includes('/id-registry') || location.pathname.includes('/unit-manager');
  const activeStore = location.pathname.includes('/id-registry')
    ? 'registry'
    : location.pathname.includes('/unit-manager')
      ? 'units'
    : location.pathname.includes('/image-store') || params.get('tab') === 'image'
      ? 'image'
      : 'text';

  let textStorePath: string;
  let imageStorePath: string;
  const registryPath = `${basePath}/id-registry`;
  const unitManagerPath = `${basePath}/unit-manager`;

  if (basePath === '/retrieved-content') {
    const textParams = new URLSearchParams(location.search);
    textParams.set('tab', 'text');
    textStorePath = `${basePath}?${textParams.toString()}`;

    const imageParams = new URLSearchParams(location.search);
    imageParams.set('tab', 'image');
    imageStorePath = `${basePath}?${imageParams.toString()}`;
  } else {
    textStorePath = `${basePath}/text-store`;
    imageStorePath = `${basePath}/image-store`;
  }

  return (
    <nav className="top-nav-bar">
      <div className="logo">{isSettingsPage ? 'Settings' : 'Vector DB'}</div>
      <div className="nav-links">
        {isSettingsPage ? (
          <>
            <SmoothLink
              to={registryPath}
              className={`nav-link ${activeStore === 'registry' ? 'active' : ''}`}>
              Unit Registry
            </SmoothLink>
            <SmoothLink
              to={unitManagerPath}
              className={`nav-link ${activeStore === 'units' ? 'active' : ''}`}>
              Unit Manager
            </SmoothLink>
          </>
        ) : (
          <>
            <SmoothLink
              to={textStorePath}
              className={`nav-link ${activeStore === 'text' ? 'active' : ''}`}>
              Text Store
            </SmoothLink>
            <SmoothLink
              to={imageStorePath}
              className={`nav-link ${activeStore === 'image' ? 'active' : ''}`}>
              Image Store
            </SmoothLink>
          </>
        )}
      </div>
    </nav>
  );
};

export default TopNavBar;
