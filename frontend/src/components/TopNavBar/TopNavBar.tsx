import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './TopNavBar.css';

interface TopNavBarProps {
  basePath?: string;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ basePath = '/vector-database' }) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isRegistryPage = location.pathname.includes('/id-registry');
  const activeStore = location.pathname.includes('/id-registry')
    ? 'registry'
    : location.pathname.includes('/image-store') || params.get('tab') === 'image'
      ? 'image'
      : 'text';

  let textStorePath: string;
  let imageStorePath: string;
  let registryPath: string | null = null;

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
    registryPath = `${basePath}/id-registry`;
  }

  return (
    <nav className="top-nav-bar">
      <div className="logo">{isRegistryPage ? 'Settings' : 'Vector DB'}</div>
      <div className="nav-links">
        {isRegistryPage ? (
          <Link
            to={registryPath || `${basePath}/id-registry`}
            className={`nav-link ${activeStore === 'registry' ? 'active' : ''}`}>
            User Registry
          </Link>
        ) : (
          <>
            <Link
              to={textStorePath}
              className={`nav-link ${activeStore === 'text' ? 'active' : ''}`}>
              Text Store
            </Link>
            <Link
              to={imageStorePath}
              className={`nav-link ${activeStore === 'image' ? 'active' : ''}`}>
              Image Store
            </Link>
            {registryPath && (
              <Link
                to={registryPath}
                className={`nav-link ${activeStore === 'registry' ? 'active' : ''}`}>
                User Registry
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
};

export default TopNavBar;
