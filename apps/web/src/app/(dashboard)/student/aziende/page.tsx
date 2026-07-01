import { loadStudentContactRequests, loadStudentChats } from "@/lib/actions/company-contacts";
import { StudentAziendeClient } from "./student-aziende-client";

export default async function StudentAziendePage() {
  const [requests, chats] = await Promise.all([
    loadStudentContactRequests(),
    loadStudentChats(),
  ]);

  return <StudentAziendeClient initialRequests={requests} initialChats={chats} />;
}
