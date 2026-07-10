"use client";

import { useState } from "react";
import { ContactRequestModal } from "../../contacts/contact-request-modal";
import { useTranslations } from "next-intl";

export function ContactButton({ slug, code }: { slug: string; code: string }) {
  const t = useTranslations("CompanyCandidateCard");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 bg-navy text-white px-5 py-2.5 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
      >
        {t("contact")}
      </button>
      {open && <ContactRequestModal slug={slug} code={code} onClose={() => setOpen(false)} />}
    </>
  );
}
