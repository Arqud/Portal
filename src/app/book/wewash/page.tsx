import type { Metadata } from "next";
import BranchChooser, { type Branch } from "../BranchChooser";

export const metadata: Metadata = {
  title: { absolute: "Book Your Wash — We Wash Cars" },
  description: "Pick your nearest We Wash branch and book a morning drop-off (08:00–11:00).",
  robots: { index: false, follow: false },
};

const BRANCHES: Branch[] = [
  { name: "Eldo Glen", area: "Centurion", url: "https://api.leadconnectorhq.com/widget/booking/ONoUh5Y6o4uUKYCGOBNi" },
  { name: "Sunnyside", area: "Pretoria", url: "https://api.leadconnectorhq.com/widget/booking/LiPi7ughPig9CDu8rfE0" },
  { name: "Lagoon / Stamford Hill", area: "Durban", url: "https://api.leadconnectorhq.com/widget/booking/HQufR2UiDrQfPSPzqvKj" },
  { name: "Sunward Park", area: "Boksburg", url: "https://api.leadconnectorhq.com/widget/booking/xF5CIDpqRwiVAPeZCu1a" },
  { name: "Greenhills", area: "Randfontein", url: "https://api.leadconnectorhq.com/widget/booking/rDXfL0CMEcYDb5ag0ZqV" },
  { name: "Maraisburg", area: "Roodepoort", url: "https://api.leadconnectorhq.com/widget/booking/SobLnvTMBcCWUrPBbK8x" },
  { name: "Old Farm Road / Faerie Glen", area: "Pretoria", url: "https://api.leadconnectorhq.com/widget/booking/eMayk2UCmVjPbVkweTCj" },
];

export default function WeWashBookingChooserPage() {
  return (
    <BranchChooser
      accent="gold"
      logoSrc="/wewash-logo.png"
      logoAlt="We Wash Cars"
      heading={
        <>
          Almost done — pick your <span className="text-arqud-gold">branch</span> to book
        </>
      }
      subline="Choose a morning drop-off (08:00–11:00). Your car's ready the same day."
      branches={BRANCHES}
      footerName="WE WASH CARS"
    />
  );
}
