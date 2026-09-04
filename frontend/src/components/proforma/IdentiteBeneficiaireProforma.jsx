/**
 * Identité du bénéficiaire — formulaire proforma unifié.
 * Date / lieu de naissance : facultatifs pour le staff guichet ;
 * pour un étudiant connecté, `birthDateRequired` impose la date si absente du profil.
 */
export default function IdentiteBeneficiaireProforma({
  form,
  up,
  /** Affiche prénom / nom / e-mail en lecture seule (demande en ligne depuis compte). */
  identityReadOnly = false,
  /** E-mail obligatoire (demande sans compte). */
  emailRequired = false,
  /** Date de naissance obligatoire (étudiants / documents admin). */
  birthDateRequired = false,
}) {
  const birthRequired = birthDateRequired === true

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-semibold">Prénom *</label>
        {identityReadOnly ? (
          <p className="input-field bg-slate-50 text-slate-800">{form.prenom || '—'}</p>
        ) : (
          <input className="input-field" value={form.prenom} onChange={up('prenom')} required />
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">Nom *</label>
        {identityReadOnly ? (
          <p className="input-field bg-slate-50 text-slate-800">{form.nom || '—'}</p>
        ) : (
          <input className="input-field" value={form.nom} onChange={up('nom')} required />
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">
          Date de naissance{birthRequired ? ' *' : ''}
        </label>
        <input
          type="date"
          className="input-field"
          value={form.date_naissance || ''}
          onChange={up('date_naissance')}
          required={birthRequired}
          readOnly={identityReadOnly && Boolean(form.date_naissance) && !birthRequired}
        />
        {!birthRequired && <p className="mt-1 text-xs text-slate-500">Facultatif</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">Lieu de naissance</label>
        <input
          className="input-field"
          value={form.lieu_naissance || ''}
          onChange={up('lieu_naissance')}
          placeholder="Ex. Dakar"
        />
        <p className="mt-1 text-xs text-slate-500">Facultatif</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">
          E-mail {emailRequired && <span className="text-red-500">*</span>}
        </label>
        {identityReadOnly ? (
          <p className="input-field bg-slate-50 text-slate-800">{form.email || '—'}</p>
        ) : (
          <input
            type="email"
            className="input-field"
            value={form.email}
            onChange={up('email')}
            required={emailRequired}
            placeholder={emailRequired ? 'Pour recevoir la facture proforma' : undefined}
          />
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">Téléphone *</label>
        <input
          className="input-field"
          type="tel"
          value={form.telephone}
          onChange={up('telephone')}
          required
          placeholder="+221 77 000 00 00"
        />
      </div>
      <div className="sm:col-span-2 space-y-3 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-800">Destinataire de la facture</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { val: 'etudiant', label: 'Facture personnelle', sub: 'Au nom du bénéficiaire' },
            { val: 'organisation', label: 'Entreprise / État / Organisation', sub: 'Tiers financeur' },
          ].map(({ val, label, sub }) => (
            <label
              key={val}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border-2 p-3 transition ${
                form.type_payeur === val
                  ? 'border-[color:var(--etab-primary,#1e40af)] bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="type_payeur_proforma"
                value={val}
                checked={form.type_payeur === val}
                onChange={up('type_payeur')}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-slate-900">{label}</span>
              <span className="text-xs text-slate-500">{sub}</span>
            </label>
          ))}
        </div>
        {form.type_payeur === 'organisation' && (
          <div>
            <label className="mb-1 block text-sm font-semibold">Destinataire *</label>
            <input
              className="input-field"
              value={form.destinataire || form.payeur_org_nom || ''}
              onChange={up('destinataire')}
              required
              placeholder="Ex. Ministère de…, Société ABC, ONG XYZ…"
            />
            <p className="mt-1 text-xs text-slate-500">
              Nom de l&apos;entreprise, de l&apos;État ou de l&apos;organisation qui finance la formation.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
