' Starts the local Steam price relay with no console window.
' Double-click this file. To stop it: Task Manager > Details > node.exe
' (the one started from this folder), or restart the PC.
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = here
' 0 = hidden window, False = don't wait for it to exit
shell.Run "node """ & here & "\local-relay.js""", 0, False
