% Code that executes after component creation.
% Paste into the App Designer app methods block.
function startupFcn(app)
    % Call the method to read Excel data.
    [dropdownOptions, columnExists] = app.readExcelData();

    if columnExists
        % Update the dropdown component's items.
        app.ModelDropDown.Items = dropdownOptions;
    else
        % Handle the case where the 'Model' column does not exist.
        disp('Column "Model" does not exist in the specified sheet.');
    end
end
