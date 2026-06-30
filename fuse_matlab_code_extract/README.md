# Fuse and Cable Protection MATLAB Code Extract

Extracted from `Code that works Fuse.pdf` for repository reference.

## Notes

- The PDF appears to contain MATLAB App Designer callback snippets rather than a complete `.mlapp` or full MATLAB class.
- Files in `app_designer_methods/` are cleaned method snippets intended to be copied into the relevant App Designer `methods` block.
- Files in `legacy_reference/` preserve earlier development versions from the PDF for traceability.
- `standalone_reference/fuseRecommendationFromExcel.m` is a non-GUI reference function based on the final callback logic. It is included to make the calculation logic easier to reuse in a repository.
- Update `excelFilePath` before running these snippets.
- The UI code assumes the App Designer app contains at least `ModelDropDown` and `UITable` components.

## Included files

### App Designer methods

- `startupFcn.m` - populates the model dropdown from Excel.
- `readExcelData.m` - reads model names from the `MachinesOnSite` sheet.
- `ModelDropDownValueChanged_final_font.m` - latest extracted callback, including fuse matching and styled table output.
- `convertValue.m` - helper used by the callback to convert Excel values.

### Legacy reference snippets

- `01_indexing_machine_manufacturer.m`
- `02_display_multiple_rows.m`
- `03_display_after_logical_comparison.m`
- `04_simplified_logical_results.m`
- `05_code_without_fuse_matching.m`
- `06_code_with_data_types_and_colour.m`
- `07_menu1_done_with_colour.m`

### Standalone reference

- `fuseRecommendationFromExcel.m` - returns a table of recommendation results without requiring App Designer.
