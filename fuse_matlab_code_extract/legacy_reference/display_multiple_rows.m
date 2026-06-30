% How to display multiple rows: manufacturer and starter motor peak current.
selectedModel = app.ModelDropDown.Value;

excelFilePath = ['C:\Users\LENOVO\Downloads\GB Engineering\Resources\Tool\APP_Fuse\Fuse_GUI_APP.xlsx'];
sheetName = 'MachinesOnSite';

headerData = readcell(excelFilePath, 'Sheet', sheetName, 'Range', 'A2:X2');
data = readtable(excelFilePath, 'Sheet', sheetName, 'Range', 'A3:X1000');

cleanedHeaderData = regexprep(headerData, '[\n\r]+', '');
cleanedHeaderData = strtrim(cleanedHeaderData);
data.Properties.VariableNames = cleanedHeaderData;

if ismember('Model', cleanedHeaderData) && ismember('Manufacturer', cleanedHeaderData) && ...
        ismember('Starter Motor Peak Current (A)', cleanedHeaderData)
    modelColumn = data.Model;
    rowIndex = find(ismember(modelColumn, selectedModel), 1);

    if ~isempty(rowIndex)
        ManufacturerColumnName = 'Manufacturer';
        CrankingCurrentColumnName = 'Starter Motor Peak Current (A)';
        selectedValue1 = data{rowIndex, ManufacturerColumnName};
        selectedValue2 = data{rowIndex, CrankingCurrentColumnName};

        if isnumeric(selectedValue1)
            selectedValue1 = num2str(selectedValue1);
        end
        if isnumeric(selectedValue2)
            selectedValue2 = num2str(selectedValue2);
        end

        tableData = {
            'Manufacturer', char(selectedValue1);
            'Starter Motor Peak Current (A)', char(selectedValue2)
        };
        app.UITable.Data = tableData;
    else
        disp('No matching data found for the selected model.');
    end
else
    disp('One or more required columns (Model, Manufacturer, Starter Motor Peak Current (A)) do not exist.');
end
