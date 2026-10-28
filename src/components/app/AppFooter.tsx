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
        {/* Handled by api/logout.ts on Vercel; local Vite has no sign-in. */}
        <form method="post" action="/api/logout">
          <button type="submit">Keluar</button>
        </form>
      </span>
    </footer>
  );
}
