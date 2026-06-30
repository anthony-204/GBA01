% Code with data types and colour.
% This is an earlier version focused on checking whether starter cranking amps
% are within the 1000 A limit and colouring the UITable row.
function code_with_data_types_and_colour(app, event) %#ok<INUSD>
    selectedModel = app.ModelDropDown.Value;

    excelFilePath = ['C:\Users\LENOVO\Downloads\GB Engineering\Resources\Tool\APP_Fuse\Fuse_GUI_APP.xlsx'];

    sheetNameMachinesOnSite = 'MachinesOnSite';
    sheetNameFuseLibrary = 'Fuse_Library';

    headerDataMachinesOnSite = readcell(excelFilePath, 'Sheet', sheetNameMachinesOnSite, 'Range', 'A2:X2');
    headerDataFuseLibrary = readcell(excelFilePath, 'Sheet', sheetNameFuseLibrary, 'Range', 'A1:K1'); %#ok<NASGU>

    dataMachinesOnSite = readtable(excelFilePath, 'Sheet', sheetNameMachinesOnSite, 'Range', 'A3:X1000');
    dataFuseLibrary = readtable(excelFilePath, 'Sheet', sheetNameFuseLibrary, 'Range', 'A2:K20'); %#ok<NASGU>

    cleanedHeaderDataMachinesOnSite = strtrim(regexprep(headerDataMachinesOnSite, '[\n\r]+', ''));
    dataMachinesOnSite.Properties.VariableNames = cleanedHeaderDataMachinesOnSite;

    modelColumn = dataMachinesOnSite.Model;
    rowIndexMachinesOnSite = find(ismember(modelColumn, selectedModel), 1);
    CrankingAmpsHighorLow = 'Data Unavailable';

    if ~isempty(rowIndexMachinesOnSite)
        StarterMotorCrankingCurrentColumnName = 'Starter Motor Peak Current (A)';
        StarterMotorCrankingCurrentValue = dataMachinesOnSite{rowIndexMachinesOnSite, StarterMotorCrankingCurrentColumnName};
        StarterMotorCrankingCurrentValue = app.convertValue(StarterMotorCrankingCurrentValue);

        if ischar(StarterMotorCrankingCurrentValue) || isstring(StarterMotorCrankingCurrentValue)
            if strcmp(StarterMotorCrankingCurrentValue, 'Data Unavailable') || strcmp(StarterMotorCrankingCurrentValue, 'TBC')
                CrankingAmpsHighorLow = 'Data Unavailable';
            end
        elseif isnumeric(StarterMotorCrankingCurrentValue)
            if StarterMotorCrankingCurrentValue <= 1000
                CrankingAmpsHighorLow = 'YES';
            else
                CrankingAmpsHighorLow = 'NO, Cranking amps over the limit, replace the starter motor';
            end
        else
            CrankingAmpsHighorLow = 'Invalid Data';
        end
    end

    tableData = {
        'Is the Starter Motor Cranking amps within the limit', CrankingAmpsHighorLow
    };
    app.UITable.Data = tableData;

    colorMatrix = repmat({'white'}, size(tableData));
    switch CrankingAmpsHighorLow
        case 'Data Unavailable'
            colorMatrix(:) = {'yellow'};
        case 'YES'
            colorMatrix(:) = {'green'};
        case 'NO, Cranking amps over the limit, replace the starter motor'
            colorMatrix(:) = {'red'};
        case 'Invalid Data'
            colorMatrix(:) = {'gray'};
    end
    app.UITable.BackgroundColor = colorMatrix;
end
