export default function ChefDepartementDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord Chef de département</h1>
      <p className="mt-2 text-slate-600">
        Validation pédagogique, effectifs, résultats
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
          <h3 className="font-medium text-slate-800">Validation des notes</h3>
          <p className="text-sm text-slate-500 mt-1">Modifications hors délai</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
          <h3 className="font-medium text-slate-800">Effectifs</h3>
          <p className="text-sm text-slate-500 mt-1">Consultation des effectifs du département</p>
        </div>
      </div>
    </div>
  );
}
