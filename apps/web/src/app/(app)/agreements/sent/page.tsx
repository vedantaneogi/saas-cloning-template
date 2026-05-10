import { redirect } from "next/navigation";

export default function AgreementsSentPage() {
  redirect("/agreements?filter=sent");
}
