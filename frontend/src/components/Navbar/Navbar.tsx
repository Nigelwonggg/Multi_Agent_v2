import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkUser();
    // Listen for storage changes
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, [location]);

  // Define links based on user role
  const getNavLinks = () => {
    const commonLinks = [{ to: "/", label: "Home" }];
    
    if (!user) {
      return [...commonLinks];
    }

    if (user.role === 'lecturer') {
      return [
        ...commonLinks,
        { to: "/chat", label: "Chat" },
        { to: "/vector-database", label: "Vector DB" },
        { to: "/upload-pdf", label: "Upload PDF" },
        { to: "/quiz", label: "Upload Quiz" },
        { to: "#settings", label: "Settings" },
      ];
    } else {
      // student role
      return [
        ...commonLinks,
        { to: "/chat", label: "Chat" },
        { to: "#quiz", label: "Quiz" },
      ];
    }
  };

  const navLinks = getNavLinks();

  // Helper to check if a link is active
  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to.startsWith("#")) return false; 
    return location.pathname.startsWith(to);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <nav className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}>
      <div className="navbar__inner">

        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <svg className="navbar__logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a9 9 0 0 1 9 9c0 3.6-2.1 6.7-5.2 8.2L12 22l-3.8-2.8A9 9 0 0 1 3 11a9 9 0 0 1 9-9z"/>
            <path d="M9 11l2 2 4-4"/>
          </svg>
          <span className="navbar__logo-text">
            Tutor<span className="navbar__logo-accent">AI</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className="navbar__links">
          {navLinks.map((link) => (
            <li key={link.label}>
              {link.to.startsWith("#") ? (
                <a
                  href={link.to}
                  className="navbar__link"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  to={link.to}
                  className={`navbar__link ${isActive(link.to) ? "navbar__link--active" : ""}`}
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* Auth Button */}
        <div className="navbar__auth">
          {user ? (
            <div className="navbar__user-info">
              <span className="navbar__user-greeting">Hi, {user.full_name}</span>
              <button onClick={handleLogout} className="btn-outline-accent">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn-accent">Login / Sign Up</Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className={`navbar__hamburger ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile Dropdown */}
      <div className={`navbar__mobile-menu ${isOpen ? "navbar__mobile-menu--open" : ""}`}>
        {navLinks.map((link) => (
          link.to.startsWith("#") ? (
            <a
              key={link.label}
              href={link.to}
              className="navbar__mobile-link"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.label}
              to={link.to}
              className={`navbar__mobile-link ${isActive(link.to) ? "navbar__mobile-link--active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          )
        ))}
        <div className="navbar__mobile-auth">
          {user ? (
            <div className="navbar__mobile-user-info">
              <span className="navbar__mobile-user-greeting">Hi, {user.full_name}</span>
              <button onClick={() => { handleLogout(); setIsOpen(false); }} className="btn-outline-accent">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn-accent" onClick={() => setIsOpen(false)}>
              Login / Sign Up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
