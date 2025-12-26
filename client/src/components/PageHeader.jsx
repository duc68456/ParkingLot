import '../styles/components/PageHeader.css';

export default function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <h2 className="page-header-title">{title}</h2>
      <p className="page-header-subtitle">{subtitle}</p>
    </div>
  );
}
