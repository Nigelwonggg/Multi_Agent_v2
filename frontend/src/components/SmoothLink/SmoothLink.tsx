import type { MouseEvent } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { useSmoothNavigate } from '../../hooks/useSmoothNavigate';

const isPlainLeftClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey;

const SmoothLink = ({ onClick, target, reloadDocument, to, ...props }: LinkProps) => {
  const smoothNavigate = useSmoothNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      reloadDocument ||
      target ||
      !isPlainLeftClick(event)
    ) {
      return;
    }

    event.preventDefault();
    smoothNavigate(to);
  };

  return (
    <Link
      {...props}
      to={to}
      target={target}
      reloadDocument={reloadDocument}
      onClick={handleClick}
    />
  );
};

export default SmoothLink;
