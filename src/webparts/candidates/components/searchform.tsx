import * as React from "react";
import * as XLSX from "xlsx";
import styles from "./searchform.module.scss";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import logo from "../assets/LOGO.png";

// PnP SP
import { spfi } from "@pnp/sp";
import { SPFx } from "@pnp/sp/presets/all";
import "@pnp/sp/webs";
import "@pnp/sp/files";

export interface ICsvSearchFormProps {
  context: WebPartContext;
}


const normalizeKey = (key: string): string =>
  key
    ? key
        .toString()
        .trim()
        .replace(/\s+|\(|\)|-+/g, "_")   // replace spaces, (), -
        .replace(/^_+|_+$/g, "")         // remove leading/trailing underscores
    : key;


const CsvSearchForm: React.FC<ICsvSearchFormProps> = ({ context }) => {
  const [data, setData] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false); // ✅ Loader state

  const rowsPerPage = 20;

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = results.slice(indexOfFirstRow, indexOfLastRow);

  const totalPages = Math.ceil(results.length / rowsPerPage);

  // ✅ Initialize SP
  const sp = React.useMemo(() => spfi().using(SPFx(context)), [context]);

  // 📂 Load Excel file from SharePoint
  React.useEffect(() => {
    const loadFile = async () => {
      try {
        const filePath =
          "/sites/Candidates/Shared Documents/All India Salaried Database/1.xlsx";
           "/sites/Candidates/Shared Documents/candidate data/113.xlsx";

        const blob = await sp.web
          .getFileByServerRelativePath(filePath)
          .getBlob();

        const buffer = await blob.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
          header: 1,
          defval: "",
        });

        if (!rows || rows.length < 2) return;

        const headers = rows[0] as string[];
        const dataRows = rows.slice(1);

        const formatted = dataRows.map((r) =>
          headers.reduce((acc, h, i) => {
            const key = normalizeKey(h);
            acc[key] = r[i] || "";
            return acc;
          }, {} as Record<string, any>)
        );

        console.log(`✅ Parsed ${formatted.length} rows from XLSX`);
        setData(formatted);
      } catch (err) {
        console.error("❌ Error fetching Excel file:", err);
      }
    };

    loadFile();
  }, [sp]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setQuery({ ...query, [e.target.name]: e.target.value });

  // 🔍 Search with loader
  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      const filtered = data.filter((row) =>
  Object.keys(query).every((key) =>
    !query[key]
      ? true
      : row[normalizeKey(key)]
          ?.toString()
          .toLowerCase()
          .includes(query[key].toLowerCase())
  )
);

      setResults(filtered);
      setCurrentPage(1);
      setLoading(false);
    }, 500); // small delay so spinner is visible
  };

  // Hide SharePoint chrome
  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      #SuiteNavWrapper,
      #spSiteHeader,
      #spLeftNav,
      .spAppBar,
      .sp-appBar,
      .sp-appBar-mobile,
      div[data-automation-id="pageCommandBar"],
      div[data-automation-id="pageHeader"],
      div[data-automation-id="pageFooter"] {
        display: none !important;
        height: 0 !important;
        overflow: hidden !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        height: 100% !important;
        width: 100% !important;
        overflow: hidden !important;
        background: #fff !important;
      }
      #spPageCanvasContent, .CanvasComponent, .CanvasZone, .CanvasSection, .control-zone {
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        max-width: 100vw !important;
      }
      .ms-FocusZone {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "auto",
        backgroundColor: "#fff",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
    >
      <div className={styles.pageWrapper}>
        {/* 🔹 Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <img src={logo} alt="Logo" style={{ width: "120px", height: "auto" }} />
          </div>

          <div className={styles.titleBlock}>
            <h1>Candidate Search</h1>
            <p>Search Candidates Easily</p>
          </div>
        </header>

        {/* 🔹 Search Form Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🔎 Search Candidates</h2>
          <div className={styles.form}>
            {["City",
 "Functional_Area",
 "Industry",
 "Key_Skills",
 "Salary",
 "Work_Experience",
 "Preferred_Location",
normalizeKey("Course(2nd_Highest_Education)") 
// returns "Course_2nd_Highest_Education"

].map((field) => (
  <input
    key={field}
    name={field} // must match normalized header
    placeholder={field.replace(/_/g, " ")}
    className={styles.input}
    value={query[field] || ""}
    onChange={handleChange}
  />
))
}

            <button
              className={styles.searchBtn}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.loading}></span>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </div>

        {/* 🔹 Results */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>📊 Results</h3>
          {results.length === 0 ? (
            <p className={styles.noResults}>No records found.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.resultsTable}>
                <thead>
                  <tr>
                    {Object.keys(results[0]).map((col) => (
                      <th key={col}>{col.replace(/_/g, " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(row).map((col) => (
                        <td key={col}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.pagination}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  ◀ Prev
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 🔹 Footer */}
        <footer className={styles.footer}>
          © 2025 Candidate Search. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default CsvSearchForm;
