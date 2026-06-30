% Value changed function: ModelDropDown
% Latest extracted version: fuse matching plus styled table output.
% Paste into the App Designer app methods block.
function ModelDropDownValueChanged_final_font(app, event) %#ok<INUSD>
    %% Model name
    selectedModel = app.ModelDropDown.Value;

    %% Model column data
    excelFilePath = ['C:\Users\BlossomFernandez\GB AUTO GROUP PTY LIMITED\DVT - Document\Projects\Simulink & ' ...
        'MATLAB\Projects\APP_Fuse\Fuse_GUI.xlsx'];

    %% Define sheet names
    sheetNameMachinesOnSite = 'MachinesOnSite';
    sheetNameFuseLibrary = 'Fuse_Library';

    %% Read headers
    headerDataMachinesOnSite = readcell(excelFilePath, 'Sheet', sheetNameMachinesOnSite, 'Range', 'A2:X2');
    headerDataFuseLibrary = readcell(excelFilePath, 'Sheet', sheetNameFuseLibrary, 'Range', 'A1:K1');

    %% Read data
    dataMachinesOnSite = readtable(excelFilePath, 'Sheet', sheetNameMachinesOnSite, 'Range', 'A3:X1000');
    dataFuseLibrary = readtable(excelFilePath, 'Sheet', sheetNameFuseLibrary, 'Range', 'A2:K20');

    %% Clean headers by removing line breaks and extra whitespace
    cleanedHeaderDataMachinesOnSite = regexprep(headerDataMachinesOnSite, '[\n\r]+', '');
    cleanedHeaderDataMachinesOnSite = strtrim(cleanedHeaderDataMachinesOnSite);
    cleanedHeaderDataFuseLibrary = regexprep(headerDataFuseLibrary, '[\n\r]+', '');
    cleanedHeaderDataFuseLibrary = strtrim(cleanedHeaderDataFuseLibrary);

    %% Assign cleaned column names to tables
    dataMachinesOnSite.Properties.VariableNames = cleanedHeaderDataMachinesOnSite;
    dataFuseLibrary.Properties.VariableNames = cleanedHeaderDataFuseLibrary;

    %% Access columns
    modelColumn = dataMachinesOnSite.Model;
    FuseRatingColumn = dataFuseLibrary.('Current rating (A)');
    ThermalEnergyColumn = dataFuseLibrary.('I2t (A2s)');
    GBPartNumberColumn = dataFuseLibrary.('GB PART #');

    %% Match selected model
    rowIndexMachinesOnSite = find(ismember(modelColumn, selectedModel), 1);

    %% Initialise default outputs
    CrankingAmpsHighorLow = 'Data Unavailable';
    CablePeakHandlingCapability = 'Data Unavailable';
    CableContiHandlingCapability = 'Data Unavailable';
    FuseClosestMatch = 'Data Unavailable';
    GBPartNumberValue = 'Data Unavailable';

    if ~isempty(rowIndexMachinesOnSite)
        %% Column names from machine data table
        StarterMotorCrankingCurrentColumnName = 'Starter Motor Peak Current (A)';
        CrankingTimeColumnName = 'Cranking time (s)';
        CableSizeColumnName = 'Cable Size(mm2)';
        AlternatorContinuousCurrentColumnName = 'Alternator Continuous Current (A)';
        CableContinuousCurrentColumnName = 'Continuous Current (A)';

        %% Constants
        FusingSafetyCurrentFactor = 125/100;
        KFactorCopper = 143;

        %% Extract values from selected machine row
        StarterMotorCrankingCurrentValue = dataMachinesOnSite{rowIndexMachinesOnSite, StarterMotorCrankingCurrentColumnName};
        CrankingTimeValue = dataMachinesOnSite{rowIndexMachinesOnSite, CrankingTimeColumnName};
        CableSizeValue = dataMachinesOnSite{rowIndexMachinesOnSite, CableSizeColumnName};
        AlternatorContinuousCurrentValue = dataMachinesOnSite{rowIndexMachinesOnSite, AlternatorContinuousCurrentColumnName};
        CableContinuousCurrentValue = dataMachinesOnSite{rowIndexMachinesOnSite, CableContinuousCurrentColumnName};

        %% Convert values
        StarterMotorCrankingCurrentValue = app.convertValue(StarterMotorCrankingCurrentValue);
        CrankingTimeValue = app.convertValue(CrankingTimeValue);
        CableSizeValue = app.convertValue(CableSizeValue);
        AlternatorContinuousCurrentValue = app.convertValue(AlternatorContinuousCurrentValue);
        CableContinuousCurrentValue = app.convertValue(CableContinuousCurrentValue);
        GBPartNumberColumn = app.convertValue(GBPartNumberColumn);

        %% Is the cranking current less than the max value?
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

        %% Can the cable handle the in-rush current demand?
        if ischar(CrankingTimeValue) || isstring(CrankingTimeValue) || ischar(CableSizeValue) || isstring(CableSizeValue)
            if strcmp(CrankingTimeValue, 'Data Unavailable') || strcmp(CrankingTimeValue, 'TBC') || ...
                    strcmp(CableSizeValue, 'Data Unavailable') || strcmp(CableSizeValue, 'TBC')
                CablePeakCurrent = 'Data Unavailable';
            else
                CablePeakCurrent = 'Invalid Data';
            end
        elseif isnumeric(CrankingTimeValue) && isnumeric(CableSizeValue)
            if CrankingTimeValue <= 5
                CablePeakCurrent = (KFactorCopper * CableSizeValue) / sqrt(CrankingTimeValue);
            else
                CablePeakCurrent = ['Cables unable handle peak current beyond 5s, ' ...
                    'investigate electrical component that needs servicing'];
            end
        else
            CablePeakCurrent = 'Invalid Data';
        end

        if ischar(StarterMotorCrankingCurrentValue) || isstring(StarterMotorCrankingCurrentValue) || ...
                ischar(CablePeakCurrent) || isstring(CablePeakCurrent)
            if strcmp(StarterMotorCrankingCurrentValue, 'Data Unavailable') || strcmp(StarterMotorCrankingCurrentValue, 'TBC') || ...
                    strcmp(CablePeakCurrent, 'Data Unavailable') || strcmp(CablePeakCurrent, 'TBC')
                CablePeakHandlingCapability = 'Data Unavailable';
            elseif strcmp(CablePeakCurrent, 'Invalid Data')
                CablePeakHandlingCapability = 'Invalid Data';
            else
                CablePeakHandlingCapability = char(CablePeakCurrent);
            end
        elseif isnumeric(StarterMotorCrankingCurrentValue) && isnumeric(CablePeakCurrent)
            if StarterMotorCrankingCurrentValue <= CablePeakCurrent
                CablePeakHandlingCapability = 'YES';
            else
                CablePeakHandlingCapability = 'NO, Change the cable to one size up';
            end
        else
            CablePeakHandlingCapability = 'Invalid Data';
        end

        %% Can the cable handle the continuous current demand?
        if ischar(AlternatorContinuousCurrentValue) || isstring(AlternatorContinuousCurrentValue) || ...
                ischar(CableContinuousCurrentValue) || isstring(CableContinuousCurrentValue)
            if strcmp(AlternatorContinuousCurrentValue, 'Data Unavailable') || strcmp(AlternatorContinuousCurrentValue, 'TBC') || ...
                    strcmp(CableContinuousCurrentValue, 'Data Unavailable') || strcmp(CableContinuousCurrentValue, 'TBC')
                CableContiHandlingCapability = 'Data Unavailable';
            else
                CableContiHandlingCapability = 'Invalid Data';
            end
        elseif isnumeric(AlternatorContinuousCurrentValue) && isnumeric(CableContinuousCurrentValue)
            if AlternatorContinuousCurrentValue <= CableContinuousCurrentValue
                CableContiHandlingCapability = 'YES';
            else
                CableContiHandlingCapability = 'NO, Change the cable to one size up';
            end
        else
            CableContiHandlingCapability = 'Invalid Data';
        end

        %% Fuse current rating calculation
        if strcmp(CableContiHandlingCapability, 'YES')
            FuseCurrentRatingCalculation = FusingSafetyCurrentFactor * CableContinuousCurrentValue;
        else
            FuseCurrentRatingCalculation = 'Data Unavailable';
        end

        %% Closest fuse match calculation
        if isnumeric(FuseCurrentRatingCalculation)
            diffFuse = abs(FuseRatingColumn - FuseCurrentRatingCalculation);
            [~, idx] = min(diffFuse);
            if ~isempty(idx)
                FuseClosestMatch = FuseRatingColumn(idx);
            else
                FuseClosestMatch = 'Data Unavailable';
            end
        else
            FuseClosestMatch = 'Data Unavailable';
        end

        %% Fuse thermal energy calculation
        if isnumeric(StarterMotorCrankingCurrentValue) && isnumeric(CrankingTimeValue) && strcmp(CrankingAmpsHighorLow, 'YES')
            RequiredThermalEnergy = (StarterMotorCrankingCurrentValue)^2 * CrankingTimeValue;
        else
            RequiredThermalEnergy = 'Data Unavailable';
        end

        %% Thermal energy match calculation
        if isnumeric(RequiredThermalEnergy) && isnumeric(FuseClosestMatch)
            validRows = (FuseRatingColumn == FuseClosestMatch) & (ThermalEnergyColumn > RequiredThermalEnergy);
            matchingThermalEnergy = ThermalEnergyColumn(validRows);
            if ~isempty(matchingThermalEnergy)
                ThermalEnergyMatch = matchingThermalEnergy(1);
            else
                ThermalEnergyMatch = 'NO MATCH';
            end
        else
            ThermalEnergyMatch = 'Data Unavailable';
        end

        %% Match GB Part #
        matchingRows = (ThermalEnergyColumn == ThermalEnergyMatch) & (FuseRatingColumn == FuseClosestMatch);
        rowIndex = find(matchingRows, 1);
        if ~isempty(rowIndex)
            GBPartNumberValue = GBPartNumberColumn(rowIndex);
        else
            GBPartNumberValue = 'Data Unavailable';
        end
    end

    %% Set UITable data
    tableData = {
        'Is the Starter Motor Cranking amps within the limit?', CrankingAmpsHighorLow;
        'Can the cable handle the in-rush current demand?', CablePeakHandlingCapability;
        'Can the cable handle the continuous current demand?', CableContiHandlingCapability;
        'Closest match for the fusing rating (A)', FuseClosestMatch;
        'GB Part #', char(string(GBPartNumberValue));
    };

    app.UITable.Data = tableData;

    %% Apply styles and alignment
    for row = 1:size(tableData, 1)
        for col = 1:size(tableData, 2)
            value = tableData{row, col};

            if isstring(value) || ischar(value)
                switch char(string(value))
                    case 'Data Unavailable'
                        applyStyles(row, col, 'yellow', 'bold');
                    case 'YES'
                        applyStyles(row, col, 'green', 'bold');
                    case {'NO', 'NO, Change the cable to one size up', ...
                            'NO, Cranking amps over the limit, replace the starter motor'}
                        applyStyles(row, col, 'red', 'bold');
                    case 'Invalid Data'
                        applyStyles(row, col, 'gray', 'bold');
                    otherwise
                        applyStyles(row, col, 'black', 'normal');
                end
            else
                applyStyles(row, col, 'black', 'normal');
            end

            applyAlignment(row, col, 'left');
        end
    end

    %% Nested helper to apply font styles
    function applyStyles(row, col, fontColor, fontWeight)
        style = uistyle;
        style.FontColor = fontColor;
        style.FontWeight = fontWeight;
        addStyle(app.UITable, style, 'cell', [row, col]);
    end

    %% Nested helper to apply alignment
    function applyAlignment(row, col, hAlign)
        alignStyle = uistyle;
        alignStyle.HorizontalAlignment = hAlign;
        addStyle(app.UITable, alignStyle, 'cell', [row, col]);
    end
end
