import ExportLeadsButton from '../components/ExportLeadsButton.jsx';
import CrmWorkspace from '../features/crm/CrmWorkspace.jsx';

function LeadsPage() {
  return (
    <>
      <ExportLeadsButton />
      <CrmWorkspace section="leads" />
    </>
  );
}

export default LeadsPage;
