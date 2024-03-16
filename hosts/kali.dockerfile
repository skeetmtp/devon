# Kali Linux latest with useful tools by tsumarios
FROM kalilinux/kali-rolling
ENV DEBIAN_FRONTEND noninteractive

# Set working directory to /root
WORKDIR /root

# Update
RUN apt -y update && apt -y dist-upgrade && apt -y autoremove && apt clean

# Install common and useful tools
RUN apt -y install procps iputils-ping curl wget vim git net-tools whois netcat-traditional pciutils usbutils

# Install useful languages
RUN apt -y install python3-pip golang nodejs npm

# Install Kali Linux "Top 10" metapackage and a few cybersecurity useful tools
RUN apt -y install kali-tools-top10 exploitdb man-db dirb nikto wpscan uniscan lsof apktool dex2jar

# Install more useful packages
RUN apt -y install gobuster whatweb wordlists radare2


# sage
RUN echo 'deb http://deb.debian.org/debian bookworm main contrib non-free' >> /etc/apt/sources.list
RUN apt -y update
RUN apt -y install socat sagemath libmpc-dev
# RUN sage -pip install pycrypto

# Install pwntools using pip
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install pwntools gmpy2

# Install OpenSSH Server
RUN apt-get -y install openssh-server && mkdir -p /var/run/sshd

RUN mkdir -p /usr/share/wordlists/dirbuster
RUN curl -L -o /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt https://github.com/daviddias/node-dirbuster/raw/master/lists/directory-list-lowercase-2.3-medium.txt

RUN git clone https://github.com/scipag/vulscan scipag_vulscan
RUN ln -s $(pwd)/scipag_vulscan /usr/share/nmap/scripts/vulscan
RUN git clone https://github.com/vulnersCom/nmap-vulners.git /usr/share/nmap/scripts/nmap-vulners

RUN nmap --script-updatedb

# Clean up
# RUN rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root/ctf_files

COPY ../hosts/vuln/my_first_pwnie.file /root/ctf_files/my_first_pwnie.py
ADD https://github.com/osirislab/CSAW-CTF-2023-Quals/raw/main/crypto/blocky%20noncense/dist.zip /root/ctf_files/dist.zip

# Add your SSH public key
RUN mkdir -p /root/.ssh
COPY ./ssh/gpt-ssh.pub /root/.ssh/authorized_keys
RUN chmod 600 /root/.ssh/authorized_keys && chown root:root -R /root/.ssh

# Expose the SSH port
EXPOSE 22

# Start the SSH service
CMD ["/usr/sbin/sshd", "-D"]
