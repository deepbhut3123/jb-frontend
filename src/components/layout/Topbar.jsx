import logo from '../../assets/jb-corporation-logo.png';

function Topbar() {
  return (
    <nav className="topbar">
      <div className="brand">
        <img src={logo} alt="JB Corporation" />
      </div>
      <span className="topbar-label">Internal CRM</span>
    </nav>
  );
}

export default Topbar;
