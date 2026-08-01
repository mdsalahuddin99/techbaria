import { Metadata } from "next";
import { UpdatesClient } from "./UpdatesClient";

export const metadata: Metadata = {
  title: "System Updates | Tech Baria",
  description: "View the latest features, improvements, and fixes in the system.",
};

export default function UpdatesPage() {
  return <UpdatesClient />;
}
