import { redirect } from 'next/navigation';

/** URL canonique côté pédagogie : même écran que sous /scolarite (liste partagée). */
export default function PedagogieEnseignantsPage() {
  redirect('/dashboard/scolarite/enseignants');
}
