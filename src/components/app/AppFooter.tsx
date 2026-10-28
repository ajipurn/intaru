import { ArrowUpRight } from "lucide-react";
import { SOURCE_URL } from "../../lib/data";
import type { DataIndex } from "../../types";

const dateFormat: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

export function AppFooter({ data }: { data?: DataIndex }) {
  return (
    <footer className="app-footer">
      <span>Informasi tata ruang</span>
      <span>
        {data ? `Data ${new Date(data.exportedAt).toLocaleDateString("id-ID", dateFormat)}` : "Kabupaten Kebumen"}
        <a href={data?.sourceUrl || SOURCE_URL} target="_blank" rel="noreferrer">
          Sumber data
          <ArrowUpRight size={13} />
        </a>
      </span>
    </footer>
  );
}
