import os

def ApplicationPrint(string):
    print("\033[32;47m "+ string+ "\033[0m")

def CreateAccountAndSetContract(name):
    ApplicationPrint("Create account: " + str(name))
    os.system("cleos create account eosio " + str(name) + " EOS6yExvTiSWy7vgKFt2xtvHA7fSGUKP3TAW3DgtNxB2M8YiZHBs5 EOS6yExvTiSWy7vgKFt2xtvHA7fSGUKP3TAW3DgtNxB2M8YiZHBs5")
    ApplicationPrint("Set contract eosio.token for: " + str(name))
    os.system("cleos set contract " + str(name) + " /home/tyd/git/eos/build/contracts/eosio.token -p "+ str(name) +"@active")

ApplicationPrint("Unlock wallet tyd")
os.system("cleos wallet unlock -n tyd --password PW5JM35wHotCBhpyus96YXC5U4L7NAZn3WsPudaEWMKLhgyRM9FMQ")

CreateAccountAndSetContract("eosio.token")

for i in range(1,3,1):
    for j in range(1,6,1):
        CreateAccountAndSetContract("home" + str(i) + str(j))
        CreateAccountAndSetContract("home" + str(i) + str(j)+".bank")

CreateAccountAndSetContract("center.bank")


### CLEAN
ApplicationPrint("Create token CLEAN")
os.system("cleos push action eosio.token create '[\"center.bank\", \"1000000000.0000 CLEAN\",0,0,0]' -p eosio.token")

ApplicationPrint("Give 100 toke to user")
for i in range(1,3,1):
    for j in range(1,6,1):
        os.system("cleos push action eosio.token issue '[\"home" + str(i) + str(j) + "\", \"100.0000 CLEAN\",0,0,0]' -p center.bank")

ApplicationPrint("Give 100000 token to bank")
for i in range(1,3,1):
    for j in range(1,6,1):
        os.system("cleos push action eosio.token issue '[\"" + "home" + str(i) + str(j)+".bank\", \"100000.0000 CLEAN\",0,0,0]' -p center.bank")


### FOSSIL
ApplicationPrint("Create token FOSSIL")
os.system("cleos push action eosio.token create '[\"center.bank\", \"1000000000.0000 FOSSIL\",0,0,0]' -p eosio.token")

ApplicationPrint("Give 100 toke to user")
for i in range(1,3,1):
    for j in range(1,6,1):
        os.system("cleos push action eosio.token issue '[\"home" + str(i) + str(j) + "\", \"100.0000 FOSSIL\",0,0,0]' -p center.bank")

ApplicationPrint("Give 100000 token to bank")
for i in range(1,3,1):
    for j in range(1,6,1):
        os.system("cleos push action eosio.token issue '[\"" + "home" + str(i) + str(j)+".bank\", \"100000.0000 FOSSIL\",0,0,0]' -p center.bank")
