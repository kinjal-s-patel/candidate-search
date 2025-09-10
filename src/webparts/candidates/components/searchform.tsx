import * as React from "react";

import styles from "./searchform.module.scss";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import logo from "../assets/LOGO.png";

// PnP SP
// import { spfi } from "@pnp/sp";
// import { SPFx } from "@pnp/sp/presets/all";
import "@pnp/sp/webs";
import "@pnp/sp/files";

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
  const [data, setData] = React.useState<any[]>([]);
  const [] = React.useState<string[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  const rowsPerPage = 20;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = results.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(results.length / rowsPerPage));

  // SP init
  // const sp = React.useMemo(() => spfi().using(SPFx(context)), [context]);

  // Load Excel and normalize headers once
  React.useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);

     const res = await fetch("http://localhost:3000/api/users?page=1&pageSize=100000");

if (!res.ok) {
  throw new Error(`API error ${res.status}: ${res.statusText}`);
}

const rows = await res.json();
console.log("✅ API response received:", rows);
if (Array.isArray(rows)) {
  console.log(`✅ Received ${rows.length} rows from database`);
} else {
  console.warn("⚠️ API did not return an array:", rows);
}

      setData(rows);
      setResults(rows); // initialize results with all rows
      console.log(`Fetched ${rows.length} rows from API`);
    } catch (err) {
      console.error("Error fetching API data:", err);
      setData([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, []);

  // fields to render (use human-friendly labels but compute normalized keys)
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

  // safe helper to extract unique values for a given normalized key
  const getUniqueValues = React.useCallback(
    (key: string) => {
      try {
        if (!Array.isArray(data) || data.length === 0) return [];
        const vals: string[] = [];
        for (const row of data) {
          try {
            const rawVal = row?.[key];
            if (rawVal === null || rawVal === undefined) continue;

            if (typeof rawVal === "string" || typeof rawVal === "number" || typeof rawVal === "boolean") {
              const s = String(rawVal).trim();
              if (s) vals.push(s);
              continue;
            }

            // if it's an array (e.g. skills stored as array)
            if (Array.isArray(rawVal)) {
              const joined = rawVal.map((v) => String(v).trim()).filter(Boolean).join(", ");
              if (joined) vals.push(joined);
              continue;
            }

            // if it's an object, try common properties or stringify
            if (typeof rawVal === "object") {
              const candidate = String(rawVal?.Title ?? rawVal?.Name ?? rawVal?.name ?? rawVal?.label ?? JSON.stringify(rawVal)).trim();
              if (candidate) vals.push(candidate);
              continue;
            }
          } catch (inner) {
            // ignore badly shaped row cell
            continue;
          }
        }

        // unique & preserve insertion order
        return Array.from(new Set(vals));
      } catch (e) {
        console.error("getUniqueValues error for key", key, e);
        return [];
      }
    },
    [data]
  );

  const cityKey = normalizeKey("City");
  const cityOptions = React.useMemo(() => getUniqueValues(cityKey), [getUniqueValues, cityKey]);

  // handle change (inputs use normalized `name`)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setQuery((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Search using normalized keys that are stored in query
  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const filtered = data.filter((row) =>
          Object.entries(query).every(([k, v]) => {
            if (!v || v.toString().trim() === "") return true;
            const cell = row?.[k];
            const text = cell === null || cell === undefined ? "" : typeof cell === "object" ? JSON.stringify(cell) : String(cell);
            return text.toLowerCase().includes(v.toLowerCase());
          })
        );
        setResults(filtered);
        setCurrentPage(1);
      } catch (e) {
        console.error("Search error:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Clear filters
  const handleClear = () => {
    setQuery({});
    setResults([]);
    setCurrentPage(1);
  };

  // Hide SharePoint chrome (kept as you had it)
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
            {formFields.map(({ key, label }) =>
              key === cityKey ? (
                <div key={key} className={styles.inputGroup}>
                  <input
                    list="city-options"
                    name={key}
                    placeholder={label}
                    className={styles.input}
                    value={query[key] || ""}
                    onChange={handleChange}
                  />
                  <datalist id="city-options">
                    {cityOptions.map((city, i) => (
                      <option key={i} value={city} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <input
                  key={key}
                  name={key}
                  placeholder={label}
                  className={styles.input}
                  value={query[key] || ""}
                  onChange={handleChange}
                />
              )
            )}

            <div className={styles.buttonGroup}>
              <button className={styles.searchBtn} onClick={handleSearch} disabled={loading}>
                {loading ? <span className={styles.loading}></span> : "Search"}
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
                        <td key={col}>{Array.isArray(row[col]) ? row[col].join(", ") : String(row[col] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.pagination}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  ◀ Prev
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
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
