' BrowserShield Launcher
' This script launches the BrowserShield server

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Change to the script directory
WshShell.CurrentDirectory = scriptDir

' Check if required files exist
If Not fso.FileExists(scriptDir & "\node.exe") Then
    MsgBox "ERROR: node.exe not found in installation directory." & vbCrLf & _
           "Please reinstall BrowserShield.", vbCritical, "BrowserShield Error"
    WScript.Quit 1
End If

If Not fso.FileExists(scriptDir & "\server.js") Then
    MsgBox "ERROR: server.js not found in installation directory." & vbCrLf & _
           "Please reinstall BrowserShield.", vbCritical, "BrowserShield Error"
    WScript.Quit 1
End If

' Start the Node.js server
' Using cmd /c to run in a new window that stays open
WshShell.Run "cmd /k title BrowserShield Server && node.exe server.js", 1, False

' Wait for server to start (3 seconds)
WScript.Sleep 3000

' Open browser to localhost:5000
WshShell.Run "http://localhost:5000", 1, False
