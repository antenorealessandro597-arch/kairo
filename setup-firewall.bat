@echo off
netsh advfirewall firewall add rule name="Kairo Control 3443" dir=in action=allow protocol=TCP localport=3443 profile=private
pause
