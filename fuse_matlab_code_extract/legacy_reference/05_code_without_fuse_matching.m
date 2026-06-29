% Code without fuse matching.
selectedModel = app.ModelDropDown.Value;

excelFilePath = ['C:\Users\BlossomFernandez\GB AUTO GROUP PTY LIMITED\DVT - Document\Projects\Simulink & ' ...
    'MATLAB\Projects\APP_Fuse\Fuse_GUI.xlsx'];

sheetNameMachinesOnSite = 'MachinesOnSite';
sheetNameFuseLibrary = 'Fuse_Library';

headerDataMachinesOnSite = readcell(excelFilePath, 'Sheet', sheetNameMachinesOnSite, 'Range', 'A2:X2');
headerDataFuseLibrary = readcell(excelFilePath, 'Sheet', sheetNameFuseLibrary, 'Range', 'A1:K1');

dataMachinesOnSite = readtable(excelFilePath, 'Sheet', sheetNameMachinesOnSite, 'Range', 'A3:X1000');
dataFuseLibrary = readtable(excelFilePath, 'Sheet', sheetNameFuseLibrary, 'Range', 'A2:K20'); %#ok<NASGU>

cleanedHeaderDataMachinesOnSite = strtrim(regexprep(headerDataMachinesOnSite, '[\n\r]+', ''));
cleanedHeaderDataFuseLibrary = strtrim(regexprep(headerDataFuseLibrary, '[\n\r]+', ''));

dataMachinesOnSite.Properties.VariableNames = cleanedHeaderDataMachinesOnSite;
dataFuseLibrary.Properties.VariableNames = cleanedHeaderDataFuseLibrary;

modelColumn = dataMachinesOnSite.Model;
rowIndexMachinesOnSite = find(ismember(modelColumn, selectedModel), 1);

if ~isempty(rowIndexMachinesOnSite)
    CrankingCurrentColumnName = 'Starter Motor Peak Current (A)';
    CrankingTimeColumnName = 'Cranking time (s)';
    CableSizeColumnName = 'Cable Size(mm2)';
    AlternatorContinuousCurrentColumnName = 'Alternator Continuous Current (A)';
    CableContinuousCurrentColumnName = 'Continuous Current (A)';

    CrankingCurrentValue = dataMachinesOnSite{rowIndexMachinesOnSite, CrankingCurrentColumnName};
    CrankingTimeValue = dataMachinesOnSite{rowIndexMachinesOnSite, CrankingTimeColumnName};
    CableSizeValue = dataMachinesOnSite{rowIndexMachinesOnSite, CableSizeColumnName};
    AlternatorContinuousCurrentValue = dataMachinesOnSite{rowIndexMachinesOnSite, AlternatorContinuousCurrentColumnName};
    CableContinuousCurrentValue = dataMachinesOnSite{rowIndexMachinesOnSite, CableContinuousCurrentColumnName};

    if isnan(str2double(CrankingCurrentValue)) || isnan(str2double(CableSizeValue)) || isnan(str2double(CrankingTimeValue))
        CablePeakCurrentValue = 'Data Unavailable';
    else
        CablePeakCurrentValue = round((143 * str2double(CableSizeValue)) / sqrt(str2double(CrankingTimeValue)), 0);
    end

    if iscell(CrankingCurrentValue), CrankingCurrentValue = CrankingCurrentValue{:}; end
    if iscell(CablePeakCurrentValue), CablePeakCurrentValue = CablePeakCurrentValue{:}; end

    if isnan(CablePeakCurrentValue)
        CablePeakLogic = 'Data Unavailable for Calculations';
    elseif CrankingCurrentValue <= CablePeakCurrentValue
        CablePeakLogic = 'YES';
    else
        CablePeakLogic = 'NO';
    end

    if iscell(AlternatorContinuousCurrentValue)
        AlternatorContinuousCurrentValue = str2double(AlternatorContinuousCurrentValue{:});
    elseif ischar(AlternatorContinuousCurrentValue)
        AlternatorContinuousCurrentValue = str2double(AlternatorContinuousCurrentValue);
    end

    if iscell(CableContinuousCurrentValue)
        CableContinuousCurrentValue = str2double(CableContinuousCurrentValue{:});
    elseif ischar(CableContinuousCurrentValue)
        CableContinuousCurrentValue = str2double(CableContinuousCurrentValue);
    end

    if isnumeric(AlternatorContinuousCurrentValue) && isnumeric(CableContinuousCurrentValue)
        if AlternatorContinuousCurrentValue <= CableContinuousCurrentValue
            CableContinuousCurrentLogic = 'YES';
        else
            CableContinuousCurrentLogic = 'NO';
        end
    else
        CableContinuousCurrentLogic = 'Data Unavailable for Calculations';
    end

    app.UITable.Data = {
        'Can the cable handle the in-rush current demand?', CablePeakLogic;
        'Can the cable handle the continuous current demand?', CableContinuousCurrentLogic
    };
end
