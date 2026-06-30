% Indexing machine manufacturer
% Value changed function: ModelDropDown
function indexing_machine_manufacturer(app, event) %#ok<INUSD>
    selectedModel = app.ModelDropDown.Value;

    excelFilePath = 'C:\Users\LENOVO\Downloads\GB Engineering\Resources\Tool\APP_Fuse\Fuse_GUI_APP.xlsx';
    sheetName = 'MachinesOnSite';

    headerData = readcell(excelFilePath, 'Sheet', sheetName, 'Range', 'A2:X2');
    data = readtable(excelFilePath, 'Sheet', sheetName, 'Range', 'A2:X1000');
    data.Properties.VariableNames = headerData;

    modelColumn = data.Model;
    rowIndex = find(ismember(modelColumn, selectedModel), 1);

    if ~isempty(rowIndex)
        columnName = 'Manufacturer';
        if ismember(columnName, headerData)
            selectedValue = data{rowIndex, columnName};
            if ~ischar(selectedValue)
                selectedValue = char(selectedValue);
            end
            app.UITable.Data = {columnName, selectedValue};
        else
            disp(['Column ', columnName, ' does not exist in the data.']);
        end
    else
        disp('No matching data found.');
    end
end
