% Reads model names from the MachinesOnSite sheet.
% Paste into the App Designer app methods block.
function [dropdownOptions, columnExists] = readExcelData(app)
    %#ok<INUSD> app is included because this is an App Designer method.

    % Define the path to your Excel file.
    excelFilePath = ['C:\Users\BlossomFernandez\GB AUTO GROUP PTY LIMITED\DVT - Document\Projects\Simulink & ' ...
        'MATLAB\Projects\APP_Fuse\Fuse_GUI.xlsx'];

    % Define the sheet name.
    sheetName = 'MachinesOnSite';

    % Read the header from the second row.
    headerData = readcell(excelFilePath, 'Sheet', sheetName, 'Range', 'A2:X2');

    % Read the actual data starting from the third row.
    data = readtable(excelFilePath, 'Sheet', sheetName, 'Range', 'A3:X1000');

    % Clean headers by removing line breaks and extra whitespace.
    headerData = regexprep(headerData, '[\n\r]+', '');
    headerData = strtrim(headerData);

    % Assign column names to the table.
    data.Properties.VariableNames = headerData;

    % Check if the 'Model' column exists.
    columnExists = ismember('Model', data.Properties.VariableNames);

    if columnExists
        dropdownOptions = data.Model;

        % Remove empty entries where possible.
        if iscell(dropdownOptions)
            dropdownOptions = dropdownOptions(~cellfun('isempty', dropdownOptions));
        else
            dropdownOptions = dropdownOptions(~ismissing(dropdownOptions));
        end

        % Convert to cell array if needed.
        if ~iscell(dropdownOptions)
            dropdownOptions = cellstr(string(dropdownOptions));
        end
    else
        dropdownOptions = {};
    end
end
