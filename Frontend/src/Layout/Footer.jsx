import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer w-100">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-6 text-center text-md-start">
            <span className="text-muted">
              &copy; {currentYear} ShopManager. All rights reserved.
            </span>
          </div>
          <div className="col-md-6 text-center text-md-end">
            <span className="text-muted">
              Made with <FontAwesomeIcon icon={faHeart} className="text-danger mx-1" /> for better shop management
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;