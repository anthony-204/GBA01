% Displaying after logical comparison.
selectedModel = app.ModelDropDown.Value;

excelFilePath = ['C:\Users\BlossomFernandez\GB AUTO GROUP PTY LIMITED\DVT - Document\Projects\Simulink & ' ...
    'MATLAB\Projects\APP_Fuse\Fuse_GUI.xlsx'];
sheetName = 'MachinesOnSite';

headerData = readcell(excelFilePath, 'Sheet', sheetName, 'Range', 'A2:X2');
data = readtable(excelFilePath, 'Sheet', sheetName, 'Range', 'A3:X1000');
cleanedHeaderData = strtrim(regexprep(headerData, '[\n\r]+', ''));
data.Properties.VariableNames = cleanedHeaderData;

if ismember('Model', cleanedHeaderData) && ismember('Manufacturer', cleanedHeaderData) && ...
        ismember('Starter Motor Peak Current (A)', cleanedHeaderData)
    modelColumn = data.Model;
    rowIndex = find(ismember(modelColumn, selectedModel), 1);

    if ~isempty(rowIndex)
        selectedValue1 = data{rowIndex, 'Manufacturer'};
        selectedValue2 = data{rowIndex, 'Starter Motor Peak Current (A)'};

        if isempty(selectedValue1) || strcmp(selectedValue1, 'TBC')
            selectedValue1 = 'Data Unavailable';
        end
        if isempty(selectedValue2) || strcmp(selectedValue2, 'TBC')
            selectedValue2 = 'Data Unavailable';
        end

        if strcmp(selectedValue2, 'Data Unavailable')
            selectedValue3 = 'Data Unavailable';
        elseif str2double(selectedValue2) <= 1000
            selectedValue3 = 'YES';
        else
            selectedValue3 = 'NO';
        end

        if isnumeric(selectedValue1), selectedValue1 = num2str(selectedValue1); end
        if isnumeric(selectedValue2), selectedValue2 = num2str(selectedValue2); end
        if isnumeric(selectedValue3), selectedValue3 = num2str(selectedValue3); end

        tableData = {
            'Manufacturer', char(selectedValue1);
            'Is the cranking current less than the max (1000A) value?', char(selectedValue3)
        };
        app.UITable.Data = tableData;
    else
        disp('No matching data found for the selected model.');
    end
else
    disp('One or more required columns (Model, Manufacturer, Starter Motor Peak Current (A)) do not exist.');
end
