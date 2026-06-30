% Helper to convert values imported from Excel.
% Paste into the App Designer app methods block.
function output = convertValue(~, val)
    if iscell(val)
        % If it is a scalar cell, extract the element. If it is a cell array,
        % convert the whole array to string/numeric where possible.
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
