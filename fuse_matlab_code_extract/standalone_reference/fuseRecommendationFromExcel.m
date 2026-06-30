function resultTable = fuseRecommendationFromExcel(excelFilePath, selectedModel)
%FUSERECOMMENDATIONFROMEXCEL Non-GUI reference implementation of the Fuse GUI logic.
%
% resultTable = fuseRecommendationFromExcel(excelFilePath, selectedModel)
%
% Inputs:
%   excelFilePath - path to Fuse_GUI.xlsx
%   selectedModel - model name to look up in MachinesOnSite
%
% Output:
%   resultTable - table with Item and Value columns.

    sheetNameMachinesOnSite = 'MachinesOnSite';
    sheetNameFuseLibrary = 'Fuse_Library';

    headerDataMachinesOnSite = readcell(excelFilePath, 'Sheet', sheetNameMachinesOnSite, 'Range', 'A2:X2');
    headerDataFuseLibrary = readcell(excelFilePath, 'Sheet', sheetNameFuseLibrary, 'Range', 'A1:K1');

    dataMachinesOnSite = readtable(excelFilePath, 'Sheet', sheetNameMachinesOnSite, 'Range', 'A3:X1000');
    dataFuseLibrary = readtable(excelFilePath, 'Sheet', sheetNameFuseLibrary, 'Range', 'A2:K20');

    cleanedHeaderDataMachinesOnSite = strtrim(regexprep(headerDataMachinesOnSite, '[\n\r]+', ''));
    cleanedHeaderDataFuseLibrary = strtrim(regexprep(headerDataFuseLibrary, '[\n\r]+', ''));

    dataMachinesOnSite.Properties.VariableNames = cleanedHeaderDataMachinesOnSite;
    dataFuseLibrary.Properties.VariableNames = cleanedHeaderDataFuseLibrary;

    modelColumn = dataMachinesOnSite.Model;
    FuseRatingColumn = dataFuseLibrary.('Current rating (A)');
    ThermalEnergyColumn = dataFuseLibrary.('I2t (A2s)');
    GBPartNumberColumn = convertValue(dataFuseLibrary.('GB PART #'));

    rowIndexMachinesOnSite = find(ismember(modelColumn, selectedModel), 1);

    CrankingAmpsHighorLow = 'Data Unavailable';
    CablePeakHandlingCapability = 'Data Unavailable';
    CableContiHandlingCapability = 'Data Unavailable';
    FuseClosestMatch = 'Data Unavailable';
    GBPartNumberValue = 'Data Unavailable';

    if ~isempty(rowIndexMachinesOnSite)
        StarterMotorCrankingCurrentValue = convertValue(dataMachinesOnSite{rowIndexMachinesOnSite, 'Starter Motor Peak Current (A)'});
        CrankingTimeValue = convertValue(dataMachinesOnSite{rowIndexMachinesOnSite, 'Cranking time (s)'});
        CableSizeValue = convertValue(dataMachinesOnSite{rowIndexMachinesOnSite, 'Cable Size(mm2)'});
        AlternatorContinuousCurrentValue = convertValue(dataMachinesOnSite{rowIndexMachinesOnSite, 'Alternator Continuous Current (A)'});
        CableContinuousCurrentValue = convertValue(dataMachinesOnSite{rowIndexMachinesOnSite, 'Continuous Current (A)'});

        FusingSafetyCurrentFactor = 125/100;
        KFactorCopper = 143;

        if isnumeric(StarterMotorCrankingCurrentValue)
            if StarterMotorCrankingCurrentValue <= 1000
                CrankingAmpsHighorLow = 'YES';
            else
                CrankingAmpsHighorLow = 'NO, Cranking amps over the limit, replace the starter motor';
            end
        elseif isUnavailable(StarterMotorCrankingCurrentValue)
            CrankingAmpsHighorLow = 'Data Unavailable';
        else
            CrankingAmpsHighorLow = 'Invalid Data';
        end

        if isnumeric(CrankingTimeValue) && isnumeric(CableSizeValue)
            if CrankingTimeValue <= 5
                CablePeakCurrent = (KFactorCopper * CableSizeValue) / sqrt(CrankingTimeValue);
            else
                CablePeakCurrent = 'Cables unable handle peak current beyond 5s, investigate electrical component that needs servicing';
            end
        elseif isUnavailable(CrankingTimeValue) || isUnavailable(CableSizeValue)
            CablePeakCurrent = 'Data Unavailable';
        else
            CablePeakCurrent = 'Invalid Data';
        end

        if isnumeric(StarterMotorCrankingCurrentValue) && isnumeric(CablePeakCurrent)
            if StarterMotorCrankingCurrentValue <= CablePeakCurrent
                CablePeakHandlingCapability = 'YES';
            else
                CablePeakHandlingCapability = 'NO, Change the cable to one size up';
            end
        elseif isUnavailable(StarterMotorCrankingCurrentValue) || isUnavailable(CablePeakCurrent)
            CablePeakHandlingCapability = 'Data Unavailable';
        else
            CablePeakHandlingCapability = string(CablePeakCurrent);
        end

        if isnumeric(AlternatorContinuousCurrentValue) && isnumeric(CableContinuousCurrentValue)
            if AlternatorContinuousCurrentValue <= CableContinuousCurrentValue
                CableContiHandlingCapability = 'YES';
            else
                CableContiHandlingCapability = 'NO, Change the cable to one size up';
            end
        elseif isUnavailable(AlternatorContinuousCurrentValue) || isUnavailable(CableContinuousCurrentValue)
            CableContiHandlingCapability = 'Data Unavailable';
        else
            CableContiHandlingCapability = 'Invalid Data';
        end

        if strcmp(CableContiHandlingCapability, 'YES')
            FuseCurrentRatingCalculation = FusingSafetyCurrentFactor * CableContinuousCurrentValue;
        else
            FuseCurrentRatingCalculation = 'Data Unavailable';
        end

        if isnumeric(FuseCurrentRatingCalculation)
            diffFuse = abs(FuseRatingColumn - FuseCurrentRatingCalculation);
            [~, idx] = min(diffFuse);
            FuseClosestMatch = FuseRatingColumn(idx);
        end

        if isnumeric(StarterMotorCrankingCurrentValue) && isnumeric(CrankingTimeValue) && strcmp(CrankingAmpsHighorLow, 'YES')
            RequiredThermalEnergy = (StarterMotorCrankingCurrentValue)^2 * CrankingTimeValue;
        else
            RequiredThermalEnergy = 'Data Unavailable';
        end

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

        matchingRows = (ThermalEnergyColumn == ThermalEnergyMatch) & (FuseRatingColumn == FuseClosestMatch);
        partRowIndex = find(matchingRows, 1);
        if ~isempty(partRowIndex)
            GBPartNumberValue = GBPartNumberColumn(partRowIndex);
        end
    end

    Item = [
        "Is the Starter Motor Cranking amps within the limit?"
        "Can the cable handle the in-rush current demand?"
        "Can the cable handle the continuous current demand?"
        "Closest match for the fusing rating (A)"
        "GB Part #"
    ];

    Value = [
        string(CrankingAmpsHighorLow)
        string(CablePeakHandlingCapability)
        string(CableContiHandlingCapability)
        string(FuseClosestMatch)
        string(GBPartNumberValue)
    ];

    resultTable = table(Item, Value);
end

function output = convertValue(val)
    if iscell(val)
        if isscalar(val)
            val = val{1};
        else
            output = string(val);
            numericOutput = str2double(output);
            if all(~isnan(numericOutput))
                output = numericOutput;
            end
            return;
        end
    end

    if isnumeric(val)
        output = val;
    elseif ischar(val) || isstring(val)
        output = str2double(val);
        if any(isnan(output))
            output = string(val);
        end
    else
        output = val;
    end
end

function tf = isUnavailable(value)
    if ischar(value) || isstring(value)
        value = string(value);
        tf = any(value == "Data Unavailable" | value == "TBC" | value == "#N/A" | ismissing(value));
    else
        tf = false;
    end
end
