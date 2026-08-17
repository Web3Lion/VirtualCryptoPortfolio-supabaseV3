export default function LicenseFooter() {
  return (
    <footer className="cc-license-footer">
      <a
        href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
        target="_blank"
        rel="license noopener noreferrer"
        className="cc-license-badge"
      >
        <img
          src="https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png"
          alt="CC BY-NC-SA 4.0"
          width={88}
          height={31}
        />
      </a>
      <p className="cc-license-text">
        &copy; {new Date().getFullYear()} Web3Lion. Licensed under{' '}
        <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="license noopener noreferrer">
          CC BY-NC-SA 4.0
        </a>
        . Educators may use and adapt this project for classroom use with
        attribution — commercial use or resale is prohibited.
      </p>
    </footer>
  );
}
