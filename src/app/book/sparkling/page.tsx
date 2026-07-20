import type { Metadata } from "next";
import BranchChooser, { type Branch } from "../BranchChooser";

export const metadata: Metadata = {
  title: { absolute: "Book Your Detail — Sparkling Auto Care Centres" },
  description: "Pick your nearest Sparkling Auto Care Centre and book a morning drop-off (08:00–11:00).",
  robots: { index: false, follow: false },
};

const BRANCHES: Branch[] = [
  { name: "Menlyn", area: "Pretoria", url: "https://api.leadconnectorhq.com/widget/booking/0I8nwRceNenR1QmaI8FR" },
  { name: "Rustenburg", url: "https://api.leadconnectorhq.com/widget/booking/v3Jq3KM7f95M6q6qu9pY" },
];

export default function SparklingBookingChooserPage() {
  return (
    <BranchChooser
      accent="blue"
      logoSrc="/sparkling-logo.png"
      logoAlt="Sparkling Auto Care Centres"
      heading={
        <>
          Almost done — pick your <span className="text-arqud-blue">branch</span> to book
        </>
      }
      subline="Choose a morning drop-off (08:00–11:00). Your car's ready the same day."
      branches={BRANCHES}
      footerName="SPARKLING AUTO CARE CENTRES"
    />
  );
}
