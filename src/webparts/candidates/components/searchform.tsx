import * as React from "react";
import styles from "./searchform.module.scss";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import logo from "../assets/LOGO.png";
import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/security";
import "@pnp/sp/webs";
import "@pnp/sp/site-groups";
import "@pnp/sp/site-users/web";

import "@pnp/sp/webs";
export interface ICsvSearchFormProps {
  context: WebPartContext;
}

// normalization helper
const normalizeKey = (key: string) => {
  if (!key) return key;

  switch (key) {
    case "Course(Highest_Education)":
      return "CourseHighest_Education";
    case "Specialization(Highest_Education)":
      return "SpecializationHighest_Education";
    case "Course(2nd_Highest_Education)":
      return "Course2nd_Highest_Education";
    default:
      return key
        .trim()
        .replace(/\s+|\(|\)|-+/g, "_")
        .replace(/^_+|_+$/g, "");
  }
};


const CsvSearchForm: React.FC<ICsvSearchFormProps> = ({ context }) => {
  const [results, setResults] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [canExport, setCanExport] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);


  const rowsPerPage = 50;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  React.useEffect(() => {
    const sp: SPFI = spfi().using(SPFx(context));

    const checkPermission = async () => {
      try {
        const adminEmails = [
          "japan@jmsadvisory.in",
          "japan@jmstech.co",
          "kinjal@jmstech.co",
          "japan.shah@jmstech.co",
          "supal.shah@jmstech.co",
          "japan.shah@jmsadvisory.in",
          "kinjal@jmsadvisory.in", // fixed typo
          "supal.shah@jmsadvisory.in"
        ];

        const currentUser = await sp.web.currentUser();

        // log what we actually get
        console.log("Current User Info:", currentUser);

        // use both Email and LoginName to match
        const userEmail = currentUser.Email?.toLowerCase() || "";
        const userLogin = currentUser.LoginName?.toLowerCase() || "";

        const isAdmin = adminEmails.some(email =>
          userEmail.includes(email.toLowerCase()) ||
          userLogin.includes(email.toLowerCase())
        );

        setCanExport(isAdmin);
      } catch (err) {
        console.error("Error checking export permission:", err);
        setCanExport(false);
      }
    };

    checkPermission();
  }, [context]);




  const fetchPage = async (page: number, filters: Record<string, string> = {}) => {
    setLoading(true);

    // Abort previous fetch if running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(rowsPerPage),
        ...filters,
      });

      const res = await fetch(
        `https://candidatesearch-api-gxeybdf9dqbefxad.centralindia-01.azurewebsites.net/api/users?${params}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!res.ok) throw new Error("API Error");

      const result = await res.json();

      setResults(result.data || []);
      setTotalRows(result.total || 0);
      setCurrentPage(page);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Search canceled by user.");
        return;
      }
      console.error(err);
    } finally {
      setLoading(false);
      abortControllerRef.current = null; // reset controller
    }
  };



  // form fields
  const rawFormFields = [
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

  // ✅ handleSearch will fetch results
  const handleSearch = () => {
    if (Object.keys(query).length === 0) {
      alert("Please enter at least one search filter");
      return;
    }
    fetchPage(1, query);
  };

  // Pressing Enter in any filter field submits the form and runs the same search
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return; // ignore Enter while a search is already running
    handleSearch();
  };

  // Export ONLY the current page data from "results"
  const downloadCSV = () => {
    if (!canExport) {
      alert("You don't have permission to export.");
      return;
    }

    if (results.length === 0) {
      alert("No data available to export.");
      return;
    }

    try {
      // Build CSV
      const headers = Object.keys(visibleColumnsMap);     // visible column names
      const keys = Object.values(visibleColumnsMap);      // API keys

      const csvRows = [
        headers.join(","), // Header row
        ...results.map(row =>
          keys
            .map(key => {
              let value = row[key];
              if (Array.isArray(value)) value = value.join(", ");
              if (!value) value = "";
              return `"${String(value).replace(/"/g, '""')}"`;
            })
            .join(",")
        )
      ];

      const csvContent = csvRows.join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `candidate_page_${currentPage}.csv`;
      link.click();

    } catch (err) {
      console.error("Export error:", err);
      alert("Something went wrong while exporting.");
    }
  };



  // ✅ clear filters (no auto-fetch)
  const handleClear = () => {
    setQuery({});
    setResults([]); // clear results
    setTotalRows(0);
    setCurrentPage(1);
  };
  const visibleColumnsMap: Record<string, string> = {
    "Name": "Name",
    "Mobile": "Mobile",
    "Email": "Email",
    // "Address": "Address",
    "City": "City",
    "Functional Area": "Functional_Area",
    "Industry": "Industry",
    "Key Skills": "Key_Skills",
    "Area of Specialization": "Area_of_Specialization",
    "Company": "Company",
    "Salary": "Salary",
    "Work Experience": "Work_Experience",
    // "Level": "Level",
    "Preferred Location": "Preferred_Location",
    "CourseHighest Education": "CourseHighest_Education",
    "SpecializationHighest Education": "SpecializationHighest_Education",
    "Course2nd Highest Education": "Course2nd_Highest_Education",

  };
  console.log(results[0]); // check exact keys and structure

  const cities = [
    "Mumbai", "Delhi", "Bengaluru","bangalore", "Kolkata", "Chennai", "Hyderabad", "Pune", "Ahmedabad","Junagadh",
    "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam",
    "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad",
    "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad",
    "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore",
    "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati",
    "Chandigarh", "Solapur", "Hubli-Dharwad", "Tiruchirappalli", "Bareilly", "Mysore",
    "Tiruppur", "Gurgaon", "Aligarh", "Jalandhar", "Bhubaneswar", "Salem", "Mira-Bhayandar",
    "Warangal", "Thiruvananthapuram", "Bhiwandi", "Saharanpur", "Guntur", "Amravati", "Bikaner",
    "Noida", "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar",
    "Dehradun", "Durgapur", "Asansol", "Rourkela", "Ajmer", "Tirunelveli", "Malegaon",
    "Jamnagar", "Ujjain", "Siliguri", "Jhansi", "Ulhasnagar", "Jammu", "Sangli-Miraj",
    "Mangalore", "Erode", "Belgaum", "Kurnool", "Tirupati", "Kolhapur", "Ahmednagar",
    "Gulbarga", "Mhow", "Muzaffarpur", "Akola", "Sambalpur", "Bilaspur", "Ambattur",
    // Added more cities
    "Anantapur", "Arrah", "Bankura", "Baran", "Barasat", "Begusarai", "Berhampore", "Bettiah",
    "Chhindwara", "Chittoor", "Cooch Behar", "Darbhanga", "Egra", "Eluru", "Farrukhabad",
    "Gaya", "Haldwani", "Hazaribagh", "Imphal", "Itanagar", "Jalgaon", "Jalpaiguri", "Kharagpur",
    "Kishanganj", "Kollam", "Korba", "Kozhikode", "Latur", "Malappuram", "Mau", "Mirzapur",
    "Moradabad", "Nagapattinam", "Nagercoil", "Naihati", "North Lakhimpur", "Ongole", "Palakkad",
    "Pali", "Parbhani", "Patan", "Patiala", "Phagwara", "Pilibhit", "Pondicherry", "Purulia",
    "Raichur", "Rajahmundry", "Rampur", "Rewa", "Sagar", "Satna", "Shivamogga", "Sikar",
    "Srinagar (J&K)", "Sultanpur", "Suryapet", "Tadepalligudem", "Tiruvannamalai", "Udaipur",
    "Udupi", "Valsad", "Vellore", "Yamunanagar", "Zunheboto","chennai"
  ];


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

  /* ---------- presentation helpers (no logic changes) ---------- */

  // Render one of the normalized text filters by its key
  const renderField = (fieldKey: string) => {
    const field = formFields.find((f) => f.key === fieldKey);
    if (!field) return null;
    const { key, label } = field;
    return (
      <label key={key} className={styles.inputGroup}>
        <span className={styles.fieldLabel}>{label}</span>
        <input
          name={key}
          placeholder={label}
          className={styles.input}
          value={query[key] || ""}
          onChange={handleChange}
        />
      </label>
    );
  };

  const rangeStart = (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd = rangeStart + results.length - 1;

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
        {/* ============ Header ============ */}
        <header className={styles.header}>
          <div className={`${styles.container} ${styles.headerInner}`}>
            <div className={styles.logo}>
              <img src={logo} alt="Logo" />
            </div>
            <div className={styles.titleBlock}>
              <h1>Candidate Search</h1>
              <p>Search Candidates Easily</p>
            </div>
          </div>
        </header>

        <main className={`${styles.container} ${styles.main}`}>
          {/* ============ Filters ============ */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeading}>
                <h2 className={styles.cardTitle}>Search candidates</h2>
                <p className={styles.cardSubtitle}>
                  Fill in one or more filters, then select Search.
                </p>
              </div>
            </div>

            <div className={styles.cardBody}>
              <form className={styles.form} onSubmit={handleSubmit}>
                {/* Group 1: Location, experience and pay */}
                <div className={styles.group}>
                  <div className={styles.groupInfo}>
                    <h3>Location and experience</h3>
                    <p>Where candidates live or want to work, and what they expect.</p>
                  </div>
                  <div className={styles.groupFields}>
                    {/* City field with dropdown */}
                    <label className={styles.inputGroup}>
                      <span className={styles.fieldLabel}>City</span>
                      <input
                        list="cities-list"
                        name="City"
                        placeholder="City"
                        className={styles.input}
                        value={query.City || ""}
                        onChange={handleChange}
                      />
                      <datalist id="cities-list">
                        {cities.map((city, idx) => (
                          <option key={idx} value={city} />
                        ))}
                      </datalist>
                    </label>
                    {renderField("Preferred_Location")}
                    {renderField("Work_Experience")}
                    {renderField("Salary")}
                  </div>
                </div>

                {/* Group 2: Role */}
                <div className={styles.group}>
                  <div className={styles.groupInfo}>
                    <h3>Role and skills</h3>
                    <p>The work area, sector and abilities you are hiring for.</p>
                  </div>
                  <div className={styles.groupFields}>
                    {renderField("Functional_Area")}
                    {renderField("Industry")}
                    {renderField("Key_Skills")}
                  </div>
                </div>

                {/* Group 3: Education */}
                <div className={styles.group}>
                  <div className={styles.groupInfo}>
                    <h3>Education</h3>
                    <p>Degrees and specializations.</p>
                  </div>
                  <div className={styles.groupFields}>
                    {renderField("CourseHighest_Education")}
                    {renderField("SpecializationHighest_Education")}
                    {renderField("Course2nd_Highest_Education")}
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.formFooter}>
                  <p className={styles.formHint}>
                    Press Enter in any field to search. Results load 50 candidates per page.
                  </p>

                  <div className={styles.buttonGroup}>
                    {/* Search Button */}
                    {!loading && (
                      <button type="submit" className={styles.searchBtn}>
                        Search
                      </button>
                    )}

                    {/* Stop Searching Button - Only visible while loading */}
                    {loading && (
                      <button
                        type="button"
                        className={styles.stopBtn}
                        onClick={() => {
                          if (abortControllerRef.current) {
                            abortControllerRef.current.abort(); // cancel fetch
                          }
                          setLoading(false); // stop loader
                        }}
                      >
                        Stop searching
                      </button>
                    )}

                    {/* Clear Button (disabled while searching) */}
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={handleClear}
                      disabled={loading}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>

          {/* ============ Results ============ */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.resultsTop}>
                <h3 className={styles.cardTitle}>Results</h3>
                {!loading && results.length > 0 && (
                  <span className={styles.resultsMeta}>
                    {totalRows.toLocaleString()} candidates found
                  </span>
                )}
              </div>

              <div className={styles.downloadWrapper}>
                <button
                  className={styles.downloadBtn}
                  onClick={downloadCSV}
                  disabled={!canExport || results.length === 0}
                  title={!canExport ? "You don't have permission to export data" : ""}
                >
                  Export page as CSV
                </button>
              </div>
            </div>

            {loading ? (
              <div className={styles.loader} role="status" aria-live="polite">
                <div className={styles.spinner} />
                Loading results...
              </div>
            ) : results.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} aria-hidden="true">🔎</div>
                <h4 className={styles.emptyTitle}>
                  {Object.keys(query).length === 0 ? "No search yet" : "No matching candidates"}
                </h4>
                <p className={styles.noResults}>
                  {Object.keys(query).length === 0
                    ? "Please enter a search filter and click Search."
                    : "No records found."}
                </p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <div className={styles.tableScroll}>
                  <table className={styles.resultsTable}>
                    <thead>
                      <tr>
                        {Object.keys(visibleColumnsMap).map(col => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, idx) => (
                        <tr key={idx}>
                          {Object.keys(visibleColumnsMap).map(col => {
                            const apiKey = visibleColumnsMap[col];
                            const cell =
                              row[apiKey] !== undefined
                                ? Array.isArray(row[apiKey])
                                  ? row[apiKey].join(", ")
                                  : row[apiKey]
                                : "";
                            return (
                              <td key={col} title={String(cell)}>
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.pagination}>
                  <button disabled={currentPage === 1} onClick={() => fetchPage(currentPage - 1, query)}>
                    ◀ Prev
                  </button>

                  <span>
                    Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} · Page {currentPage} of {totalPages}
                  </span>

                  <button disabled={currentPage === totalPages} onClick={() => fetchPage(currentPage + 1, query)}>
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className={styles.footer}>© 2025 Candidate Search. All rights reserved.</footer>
      </div>
    </div>
  );
};

export default CsvSearchForm;