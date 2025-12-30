; BrowserShield Installer Script Template
; This file is a template - placeholders will be replaced by generate-iss.js
;
; Silent Installation Support (Requirements 9.1, 9.2, 9.3, 9.4):
; - /SILENT: Installs silently with progress bar only
; - /VERYSILENT: Installs completely silently (no UI at all)
; - /DIR="path": Specifies custom installation directory
; - /LOG="path": Specifies custom log file path
; - /SUPPRESSMSGBOXES: Suppresses message boxes during installation
; - Exit codes: 0=success, 1=setup failed, 2=user cancelled, 3=fatal error
;
; Example silent installation:
;   BrowserShield-Setup-1.4.0.exe /VERYSILENT /DIR="C:\MyApps\BrowserShield" /LOG="%TEMP%\install.log"

#define MyAppName "BrowserShield"
#define MyAppVersion "1.4.0"
#define MyAppPublisher "BrowserShield Team"
#define MyAppURL "https://github.com/user/browsershield"
#define MyAppExeName "BrowserShield.exe"
#define MyAppDescription "Anti-Detect Browser Manager"

[Setup]
; Application identity
AppId={{8733EA35-5C24-6904-8929-455E8A30CD74}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
AppComments={#MyAppDescription}

; Installation directories
DefaultDirName={autopf}\BrowserShield
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Output settings
OutputDir=C:\laragon\www\TheBrowserShield\dist\installer
OutputBaseFilename=BrowserShield-Setup-{#MyAppVersion}
SetupIconFile=C:\laragon\www\TheBrowserShield\public\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

; Compression settings
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes

; Installer appearance
WizardStyle=modern
WizardSizePercent=100

; Privileges and architecture
PrivilegesRequired=admin
; Windows version requirements - Requirements 10.1, 10.2, 10.3
; MinVersion=10.0 requires Windows 10 or later (Requirement 10.1, 10.2)
; ArchitecturesAllowed=x64 requires 64-bit Windows (Requirement 10.3)
; ArchitecturesInstallIn64BitMode=x64 ensures 64-bit installation mode
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; Windows version requirements (Windows 10+ only) - Requirement 10.1, 10.2
; This will show an error and exit if Windows version is below Windows 10
MinVersion=10.0

; Allow user to select installation directory
AllowNoIcons=yes
DisableDirPage=no

; Uninstaller settings
UninstallDisplayName={#MyAppName}
CreateUninstallRegKey=yes

; Silent installation support - Requirements 9.1, 9.2, 9.3, 9.4
; CloseApplications and RestartApplications help with silent installs
CloseApplications=yes
CloseApplicationsFilter=*.exe
RestartApplications=yes
; SetupLogging enables automatic logging when /LOG parameter is used
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
english.BeveledLabel=English

[CustomMessages]
english.LaunchAfterInstall=Launch BrowserShield after installation
english.CreateDesktopIcon=Create a desktop icon
english.CreateStartMenuIcon=Create a Start Menu shortcut
english.KeepUserData=Keep user data (profiles, database)

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "startmenuicon"; Description: "{cm:CreateStartMenuIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
; Main application files
Source: "C:\laragon\www\TheBrowserShield\dist\build\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu shortcut
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startmenuicon
; Desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Post-installation launch option
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchAfterInstall}"; Flags: nowait postinstall skipifsilent shellexec

[UninstallDelete]
; Clean up generated files on uninstall (but preserve user data by default)
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\data\logs"
Type: files; Name: "{app}\*.log"


[Code]
const
  MIN_DISK_SPACE_MB = 500;
  // Exit codes for silent installation - Requirement 9.3
  EXIT_CODE_SUCCESS = 0;
  EXIT_CODE_SETUP_FAILED = 1;
  EXIT_CODE_USER_CANCELLED = 2;
  EXIT_CODE_FATAL_ERROR = 3;
  EXIT_CODE_INSUFFICIENT_SPACE = 4;
  EXIT_CODE_UNSUPPORTED_OS = 5;

var
  KeepUserDataCheckbox: TNewCheckBox;
  InstallationSuccess: Boolean;
  InstallLogPath: String;

// Check if running in silent mode - Requirement 9.1
function IsSilentInstall(): Boolean;
begin
  Result := WizardSilent;
end;

// Get the log file path for silent installations - Requirement 9.4
function GetInstallLogPath(): String;
var
  LogParam: String;
  I: Integer;
begin
  // Check if /LOG parameter was provided
  for I := 1 to ParamCount do
  begin
    LogParam := ParamStr(I);
    if (Pos('/LOG=', UpperCase(LogParam)) = 1) or (Pos('/LOG:', UpperCase(LogParam)) = 1) then
    begin
      Result := Copy(LogParam, 6, Length(LogParam) - 5);
      // Remove quotes if present
      if (Length(Result) > 0) and (Result[1] = '"') then
        Result := Copy(Result, 2, Length(Result) - 2);
      Exit;
    end;
  end;
  // Default log path in temp folder
  Result := ExpandConstant('{tmp}\BrowserShield-Install.log');
end;

// Write to installation log - Requirement 9.4
procedure WriteInstallLog(Message: String);
var
  LogContent: String;
begin
  if InstallLogPath = '' then
    InstallLogPath := GetInstallLogPath();
  
  LogContent := GetDateTimeString('yyyy-mm-dd hh:nn:ss', '-', ':') + ' - ' + Message + #13#10;
  SaveStringToFile(InstallLogPath, LogContent, True);
end;

// Check if there's enough disk space
function CheckDiskSpace(Path: String): Boolean;
var
  FreeMB: Cardinal;
begin
  FreeMB := GetSpaceOnDisk(Path, True, True) div (1024 * 1024);
  Result := FreeMB >= MIN_DISK_SPACE_MB;
end;

// Get free disk space in MB
function GetFreeDiskSpaceMB(Path: String): Cardinal;
begin
  Result := GetSpaceOnDisk(Path, True, True) div (1024 * 1024);
end;

// Validate installation directory
function NextButtonClick(CurPageID: Integer): Boolean;
var
  FreeMB: Cardinal;
  ErrorMsg: String;
begin
  Result := True;
  
  if CurPageID = wpSelectDir then
  begin
    if not CheckDiskSpace(WizardDirValue) then
    begin
      FreeMB := GetFreeDiskSpaceMB(WizardDirValue);
      
      // Log the error for silent installs - Requirement 9.4
      WriteInstallLog('ERROR: Insufficient disk space. Required: ' + IntToStr(MIN_DISK_SPACE_MB) + 
                      ' MB, Available: ' + IntToStr(FreeMB) + ' MB');
      
      if IsSilentInstall then
      begin
        // For silent install, just fail with appropriate exit code - Requirement 9.3
        Result := False;
      end
      else
      begin
        ErrorMsg := 'Insufficient disk space!' + #13#10 + 
                    'Required: ' + IntToStr(MIN_DISK_SPACE_MB) + ' MB' + #13#10 +
                    'Available: ' + IntToStr(FreeMB) + ' MB' + #13#10 +
                    'Please select a different drive or free up some space.';
        MsgBox(ErrorMsg, mbError, MB_OK);
        Result := False;
      end;
    end
    else
    begin
      WriteInstallLog('Disk space check passed. Available: ' + IntToStr(GetFreeDiskSpaceMB(WizardDirValue)) + ' MB');
    end;
  end;
end;

// Add checkbox to preserve user data during uninstall
procedure InitializeUninstallProgressForm();
begin
  KeepUserDataCheckbox := TNewCheckBox.Create(UninstallProgressForm);
  KeepUserDataCheckbox.Parent := UninstallProgressForm;
  KeepUserDataCheckbox.Left := ScaleX(20);
  KeepUserDataCheckbox.Top := UninstallProgressForm.ClientHeight - ScaleY(50);
  KeepUserDataCheckbox.Width := UninstallProgressForm.ClientWidth - ScaleX(40);
  KeepUserDataCheckbox.Height := ScaleY(20);
  KeepUserDataCheckbox.Caption := CustomMessage('KeepUserData');
  KeepUserDataCheckbox.Checked := True;
end;

// Handle uninstall - preserve user data if checkbox is checked
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    if not KeepUserDataCheckbox.Checked then
    begin
      // Remove user data if user chose not to keep it
      DelTree(ExpandConstant('{app}\data'), True, True, True);
    end;
  end;
end;

// Handle installation steps and logging - Requirements 9.3, 9.4
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
  begin
    WriteInstallLog('Starting installation...');
    WriteInstallLog('Install path: ' + ExpandConstant('{app}'));
    WriteInstallLog('Silent mode: ' + BoolToStr(IsSilentInstall));
    InstallationSuccess := False;
  end;
  
  if CurStep = ssPostInstall then
  begin
    InstallationSuccess := True;
    WriteInstallLog('Installation completed successfully.');
    WriteInstallLog('Version: ' + '{#MyAppVersion}');
    WriteInstallLog('Install Path: ' + ExpandConstant('{app}'));
    
    // Write summary log for silent installs - Requirement 9.4
    if IsSilentInstall then
    begin
      WriteInstallLog('Silent installation completed with exit code: ' + IntToStr(EXIT_CODE_SUCCESS));
    end;
  end;
end;

// Handle page changes for logging
procedure CurPageChanged(CurPageID: Integer);
begin
  case CurPageID of
    wpWelcome: WriteInstallLog('Wizard started - Welcome page');
    wpSelectDir: WriteInstallLog('Select directory page - Default: ' + WizardDirValue);
    wpSelectTasks: WriteInstallLog('Select tasks page');
    wpReady: WriteInstallLog('Ready to install page');
    wpInstalling: WriteInstallLog('Installing...');
    wpFinished: WriteInstallLog('Installation finished page');
  end;
end;

// Initialize setup - Requirement 9.1, 9.4
function InitializeSetup(): Boolean;
begin
  Result := True;
  InstallationSuccess := False;
  InstallLogPath := GetInstallLogPath();
  
  // Initialize log file
  WriteInstallLog('========================================');
  WriteInstallLog('BrowserShield Installation Log');
  WriteInstallLog('========================================');
  WriteInstallLog('Installer Version: ' + '{#MyAppVersion}');
  WriteInstallLog('Silent Mode: ' + BoolToStr(WizardSilent));
  WriteInstallLog('Command Line: ' + GetCmdTail);
  WriteInstallLog('Windows Version: ' + GetWindowsVersionString);
  WriteInstallLog('----------------------------------------');
end;

// Handle setup termination and exit codes - Requirement 9.3
procedure DeinitializeSetup();
begin
  if InstallationSuccess then
  begin
    WriteInstallLog('Setup completed successfully. Exit code: ' + IntToStr(EXIT_CODE_SUCCESS));
  end
  else
  begin
    WriteInstallLog('Setup did not complete successfully.');
  end;
  WriteInstallLog('========================================');
end;

// Cancel button click handler for logging
procedure CancelButtonClick(CurPageID: Integer; var Cancel, Confirm: Boolean);
begin
  if Cancel then
  begin
    WriteInstallLog('User cancelled installation on page: ' + IntToStr(CurPageID));
  end;
end;

// Helper function to convert boolean to string
function BoolToStr(Value: Boolean): String;
begin
  if Value then
    Result := 'True'
  else
    Result := 'False';
end;
