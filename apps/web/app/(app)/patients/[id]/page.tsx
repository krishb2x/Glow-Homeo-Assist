import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function PatientRootPage({ params }: Props) {
  const { id } = await params;
  redirect(`/patients/${id}/timeline`);
}
