import { redirect } from "next/navigation";

export default function RestockOrdersRedirect() {
  redirect("/inventory/restock");
}
