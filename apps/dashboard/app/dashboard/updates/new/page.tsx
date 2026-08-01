import { Metadata } from "next";
import { UpdateForm } from "./update-form";

export const metadata: Metadata = {
  title: "New System Update | Tech Baria",
  description: "Publish a new system update.",
};

export default function NewUpdatePage() {
  return <UpdateForm />;
}
