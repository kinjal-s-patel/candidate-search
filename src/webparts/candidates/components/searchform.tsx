import * as React from "react";
import styles from "./searchform.module.scss";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import logo from "../assets/LOGO.png";

export interface ICsvSearchFormProps {
  context: WebPartContext;
}

// normalization helper
const normalizeKey = (key: string): string =>
  key
    ? key
        .toString()
        .trim()
        .replace(/\s+|\(|\)|-+/g, "_") // replace spaces, (), -
        .replace(/^_+|_+$/g, "") // trim underscores
    : key;

const CsvSearchForm: React.FC<ICsvSearchFormProps> = ({ context }) => {
  const [results, setResults] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const rowsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  // --- ✅ Fetch from API with pagination + filters
  const fetchPage = async (page: number, filters: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: rowsPerPage.toString(),
        ...filters,
      });
      const res = await fetch(`http://localhost:3000/api/users?${params.toString()}`);
      if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);

      const result = await res.json();
      setResults(result.data || []);
      setTotalRows(result.total || 0);
      setCurrentPage(result.page || page);
    } catch (err) {
      console.error("Error fetching API data:", err);
      setResults([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };


  // form fields
  const rawFormFields = [
    "City",
    "Functional_Area",
    "Industry",
    "Key_Skills",
    "Salary",
    "Work_Experience",
    "Preferred_Location",
    "Course(Highest_Education)",
    "Specialization(Highest_Education)",
    "Course(2nd_Highest_Education)",
  ];

  const formFields = React.useMemo(
    () =>
      rawFormFields.map((raw) => {
        const key = normalizeKey(raw);
        const label = raw.replace(/_/g, " ").replace(/\(|\)/g, "");
        return { raw, key, label };
      }),
    []
  );

  // handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setQuery((prev) => ({ ...prev, [e.target.name]: e.target.value }));

// --- Remove this useEffect
// React.useEffect(() => {
//   fetchPage(1);
// }, []);

// ✅ handleSearch will fetch results
const handleSearch = () => {
  if (Object.keys(query).length === 0) {
    alert("Please enter at least one search filter");
    return;
  }
  fetchPage(1, query);
};

// ✅ clear filters (no auto-fetch)
const handleClear = () => {
  setQuery({});
  setResults([]); // clear results
  setTotalRows(0);
  setCurrentPage(1);
};


  // hide SharePoint chrome
  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      #SuiteNavWrapper,#spSiteHeader,#spLeftNav,.spAppBar,.sp-appBar,.sp-appBar-mobile,
      div[data-automation-id="pageCommandBar"],div[data-automation-id="pageHeader"],
      div[data-automation-id="pageFooter"]{display:none!important;height:0!important;overflow:hidden!important}
      html,body{margin:0!important;padding:0!important;height:100% !important;width:100% !important;overflow:hidden!important;background:#fff!important}
      #spPageCanvasContent,.CanvasComponent,.CanvasZone,.CanvasSection,.control-zone{width:100vw!important;height:100vh!important;margin:0!important;padding:0!important;overflow:hidden!important;max-width:100vw!important}
      .ms-FocusZone{overflow:hidden!important}
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
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
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <img src={logo} alt="Logo" style={{ width: "120px", height: "auto" }} />
          </div>
          <div className={styles.titleBlock}>
            <h1>Candidate Search</h1>
            <p>Search Candidates Easily</p>
          </div>
        </header>

        {/* Form card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🔎 Search Candidates</h2>

          <div className={styles.form}>
            {formFields.map(({ key, label }) => (
              <input
                key={key}
                name={key}
                placeholder={label}
                className={styles.input}
                value={query[key] || ""}
                onChange={handleChange}
              />
            ))}

            <div className={styles.buttonGroup}>
              <button className={styles.searchBtn} onClick={handleSearch} disabled={loading}>
                {loading ? "Loading..." : "Search"}
              </button>
              <button className={styles.clearBtn} onClick={handleClear} disabled={loading}>
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>📊 Results</h3>
          {results.length === 0 ? (
  <p className={styles.noResults}>
    {Object.keys(query).length === 0
      ? "Please enter a search filter and click Search."
      : "No records found."}
  </p>
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
                  {results.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(row).map((col) => (
                        <td key={col}>{Array.isArray(row[col]) ? row[col].join(", ") : String(row[col] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.pagination}>
                <button disabled={currentPage === 1} onClick={() => fetchPage(currentPage - 1, query)}>
                  ◀ Prev
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button disabled={currentPage === totalPages} onClick={() => fetchPage(currentPage + 1, query)}>
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className={styles.footer}>© 2025 Candidate Search. All rights reserved.</footer>
      </div>
    </div>
  );
};

export default CsvSearchForm;
