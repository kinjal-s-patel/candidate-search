import * as React from "react";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import styles from "./searchform.module.scss";
import { WebPartContext } from "@microsoft/sp-webpart-base";

// PnP SP
import { spfi } from "@pnp/sp";
import { SPFx } from "@pnp/sp/presets/all";
import "@pnp/sp/webs";
import "@pnp/sp/folders";
import "@pnp/sp/files";

export interface ICsvSearchFormProps {
  context: WebPartContext;
}

// 🔑 Normalize headers (replace spaces, (), - with _)
const normalizeRow = (row: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    const newKey = key.replace(/\s+|\(|\)|\-+/g, "_");
    normalized[newKey] = row[key];
  });
  return normalized;
};

const CsvSearchForm: React.FC<ICsvSearchFormProps> = ({ context }) => {
  const [data, setData] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState({
    Mobile: "",
    Email: "",
    City: "",
    Functional_Area: "",
    Industry: "",
    Key_Skills: "",
    Work_Experience: "",
    Course_2nd_Highest_Education: "",
  });
  const [results, setResults] = React.useState<any[]>([]);

  // ✅ Initialize SP
  const sp = React.useMemo(() => spfi().using(SPFx(context)), [context]);

  // 📂 Load all files from SharePoint folder
  React.useEffect(() => {
    const loadFiles = async () => {
      try {
        const folderPath =
          "/sites/Candidates/Shared Documents/All India Salaried Database";

        const files = await sp.web
          .getFolderByServerRelativePath(folderPath)
          .files();

        console.log("📂 Fetched files:", files);

        let allData: any[] = [];

        for (const file of files) {
          const fileName = file.Name.toLowerCase();

          // ================= CSV =================
          if (fileName.endsWith(".csv")) {
            const blob = await sp.web
              .getFileByServerRelativePath(file.ServerRelativeUrl)
              .getBlob();
            const text = await blob.text();
            const parsed = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
            });
            const formatted = parsed.data.map(normalizeRow);
            console.log(`✅ Parsed ${formatted.length} rows from CSV: ${file.Name}`);
            allData = [...allData, ...formatted];
          }

          // ================= XLSX =================
          if (fileName.endsWith(".xlsx")) {
            const blob = await sp.web
              .getFileByServerRelativePath(file.ServerRelativeUrl)
              .getBlob();
            const buffer = await blob.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });

            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
              header: 1, // raw rows
              defval: "",
            });

            if (!rows || rows.length < 2) continue;

            const headers = rows[0] as string[];
            const dataRows = rows.slice(1);

            const formatted = dataRows.map((r) =>
              headers.reduce((acc, h, i) => {
                const key = h
                  ? h.toString().replace(/\s+|\(|\)|\-+/g, "_")
                  : `Col${i}`;
                acc[key] = r[i] || "";
                return acc;
              }, {} as Record<string, any>)
            );

            console.log(`✅ Parsed ${formatted.length} rows from XLSX: ${file.Name}`);
            allData = [...allData, ...formatted];
          }
        }

        console.log("📊 Total rows loaded:", allData.length);
        if (allData.length > 0) {
          console.log("🔑 Sample row:", allData[0]);
        }

        setData(allData);
      } catch (err) {
        console.error("❌ Error fetching SharePoint folder:", err);
      }
    };

    loadFiles();
  }, [sp]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setQuery({ ...query, [e.target.name]: e.target.value });

  // 🔍 Search
  const handleSearch = () => {
    console.log("🔍 Search query:", query);

    const filtered = data.filter((row) =>
      Object.keys(query).every((key) =>
        !query[key as keyof typeof query]
          ? true
          : row[key]
              ?.toString()
              .toLowerCase()
              .includes(
                query[key as keyof typeof query].toString().toLowerCase()
              )
      )
    );

    console.log("📊 Search results:", filtered);
    setResults(filtered);
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
    <div className={styles.container}>
      <h2 className={styles.title}>🔎 Search Candidates</h2>

      {/* Search Form */}
      <div className={styles.form}>
        {Object.keys(query).map((key) => (
          <input
            key={key}
            name={key}
            placeholder={key.replace(/_/g, " ")}
            value={query[key as keyof typeof query]}
            onChange={handleChange}
            className={styles.input}
          />
        ))}

        <button onClick={handleSearch} className={styles.button}>
          Search
        </button>
      </div>

      {/* Results */}
      <h3 className={styles.resultsTitle}>Results</h3>
      {results.length ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>City</th>
                <th>Functional Area</th>
                <th>Industry</th>
                <th>Key Skills</th>
                <th>Work Experience</th>
                <th>Course (2nd Highest Education)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i}>
                  <td>{row.Name}</td>
                  <td>{row.Mobile}</td>
                  <td>{row.Email}</td>
                  <td>{row.City}</td>
                  <td>{row.Functional_Area}</td>
                  <td>{row.Industry}</td>
                  <td>{row.Key_Skills}</td>
                  <td>{row.Work_Experience}</td>
                  <td>{row.Course_2nd_Highest_Education}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.noResults}>No records found.</p>
      )}
    </div>
    </div>
  );
};

export default CsvSearchForm;
