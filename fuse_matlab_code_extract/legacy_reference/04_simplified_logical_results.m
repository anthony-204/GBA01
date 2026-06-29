% Simplified Excel representation and logical results.
selectedModel = app.ModelDropDown.Value;

excelFilePath = ['C:\Users\BlossomFernandez\GB AUTO GROUP PTY LIMITED\DVT - Document\Projects\Simulink & ' ...
    'MATLAB\Projects\APP_Fuse\Fuse_GUI.xlsx'];
sheetName = 'MachinesOnSite';

headerDataMachinesOnSite = readcell(excelFilePath, 'Sheet', sheetName, 'Range', 'A2:X2');
dataMachinesOnSite = readtable(excelFilePath, 'Sheet', sheetName, 'Range', 'A2:X1000');

cleanedHeaderDataMachinesOnSite = strtrim(regexprep(headerDataMachinesOnSite, '[\n\r]+', ''));
dataMachinesOnSite.Properties.VariableNames = cleanedHeaderDataMachinesOnSite;

modelColumn = dataMachinesOnSite.Model;
rowIndexMachinesOnSite = find(ismember(modelColumn, selectedModel), 1);

if ~isempty(rowIndexMachinesOnSite)
    CrankingCurrentColumnName = 'Starter Motor Peak Current (A)';
    CrankingTimeColumnName = 'Cranking time (s)';
    CableSizeColumnName = 'Cable Size(mm2)';

    CrankingCurrentValue = dataMachinesOnSite{rowIndexMachinesOnSite, CrankingCurrentColumnName};
    CrankingTimeValue = dataMachinesOnSite{rowIndexMachinesOnSite, CrankingTimeColumnName};
    CableSizeValue = dataMachinesOnSite{rowIndexMachinesOnSite, CableSizeColumnName};

    if isempty(CrankingCurrentValue) || strcmp(CrankingCurrentValue, 'TBC') || strcmp(CrankingCurrentValue, '#N/A') || ...
            strcmp(CableSizeValue, 'TBC') || strcmp(CableSizeValue, '#N/A') || ...
            strcmp(CrankingTimeValue, 'TBC') || strcmp(CrankingTimeValue, '#N/A')
        CablePeakCurrentValue = 'Data Unavailable';
    else
        CablePeakCurrentValue = round((str2double(CrankingCurrentValue) * str2double(CableSizeValue)) / ...
            sqrt(str2double(CrankingTimeValue)), 0);
    end

    if strcmp(CablePeakCurrentValue, 'Data Unavailable')
        CablePeakYESorNO = 'Data Unavailable';
    elseif str2double(CrankingCurrentValue) <= CablePeakCurrentValue
        CablePeakYESorNO = 'YES';
    else
        CablePeakYESorNO = 'NO';
    end

    app.UITable.Data = {
        'Can the cable handle the in-rush current demand? ', CablePeakYESorNO
    };
end
