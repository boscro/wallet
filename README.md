﻿# TERA Smart money

[<Документация на русском>](https://github.com/terafoundation/wallet/tree/master/Doc/Rus)

Attention:
* After the installation shown below, enter the address in the browser: 127.0.0.1
* To connect to the network and start sync, you must have a static (public) IP address and an open port.
* Do not forget to set a password to restrict access to http (click the HTTP ACCESS button on your wallet). We also recommend changing port 80 to another and not storing private keys on remote servers.
* We recommend putting an additional password on the private key ("Set password" button) - in this case the private key will be stored in file in encrypted form.



## Installing on Windows by steps:

1. Download and install Nodejs https://nodejs.org (v8.11 is recommended)
2. Download and install git https://git-scm.com/download/win
3. Then run the commands (in program: cmd or PowerShell):

```
cd ..\..\..\
git clone https://github.com/terafoundation/wallet.git
cd wallet/Source
npm install
node set httpport:8080 password:<secret word (no spaces)>
run-node.bat

```
If you want to run the wallet as a background process, then instead of the last command (run-node.bat), do the following:
```
npm install pm2 -g
pm2 start run-node.js
```

### Opening ports:
```
netsh advfirewall firewall add rule name="Open 30000 port" protocol=TCP localport=30000 action=allow dir=IN
```

### Updates

```
cd wallet
git reset --hard 
git clean -f
git pull 
```



## Installation on Linux 

### CentOS 7:


```
sudo yum install -y git
curl --silent --location https://rpm.nodesource.com/setup_8.x | sudo bash -
sudo yum  install -y nodejs
sudo npm install pm2 -g
sudo git clone https://github.com/terafoundation/wallet.git
cd wallet/Source
sudo npm install
sudo node set httpport:8080 password:<secret word (no spaces)>
sudo pm2 start run-node.js
```

### open ports (all):
```
systemctl stop firewalld 
systemctl disable firewalld
```

### Updates

```
cd wallet
sudo git reset --hard 
sudo git clean -f
sudo git pull 
```



### UBUNTU 18.4:

```
sudo apt-get install -y git
sudo apt-get install -y nodejs
sudo apt-get install -y npm
sudo npm install pm2 -g
sudo git clone https://github.com/terafoundation/wallet.git
cd wallet/Source
sudo npm install
sudo node set httpport:8080 password:<secret word (no spaces)>
sudo pm2 start run-node.js
```

### open ports:

```
sudo ufw allow 30000/tcp
sudo ufw allow 80/tcp
```




### Updates

```
cd wallet
sudo git reset --hard 
sudo git pull 
```


## TEST NETWORK
Default values:
```
port:40000
httpport:8080
```
Lunch: 
```
sudo node set-test httpport:8080 password:SecretWord
sudo pm2 start run-test.js
```
### Notes:
I do not recommend installing the test network on the same computer for the following reasons:
* If the test network will have a security hole, it will extend to the working node
* You may experience problems with a remote connection. Due to the peculiarities of storing cookies of the same domain in browsers. However, you can avoid this if you create domain synonyms in a file similar to hosts in windows and use a different alias for the test machine.








## Specification

* Name: TERA
* Consensus: PoW
* Algorithm:  Terahash (sha3 + Optimize RAM hashing)
* Max emission: 1 Bln
* Reward for block: 1-20 coins, depends on miner power (one billionth of the remainder of undistributed amount of coins and multiplied by the hundredth part of the square of the logarithm of the miner power)
* Block size 120 KB
* Premine: 5%
* Development fund: 1% of the mining amount
* Block generation time: 1 second
* Block confirmation time: 8 seconds
* Speed: from 1000 transactions per second
* Commission: free of charge 
* Cryptography: sha3, secp256k1
* Protection against DDoS: PoW (hash calculation)
* Platform: Node.JS


# FAQs

## Solving connection problems (when no start sync)
* Check the presence of a direct ip-address (order from the provider)
* Check if the port is routed from the router to your computer
* Check the firewall (port must open on the computer)



## Refs:
* Btt: https://bitcointalk.org/index.php?topic=4573801.0
* Twitter: https://twitter.com/terafoundation
* Telegram: https://web.telegram.org/#/im?p=@terafoundation
* Discord: https://discord.gg/CvwrbeG
* [Документация на русском](https://github.com/terafoundation/wallet/tree/master/Doc/Rus)

