curl "http://localhost:8080/login?id=Yaron Pdut&token=71029" -o tests\login.htm
curl "http://localhost:8080/voters?id=Yaron Pdut"  -o tests\voters.htm
curl -XGET "http://localhost:8080/votes" -o tests\votes.htm
127.0.0.1:8080/vote?id=Yaron Pdut&token=71029&project1=1&project2=2&project3=3&project4=4&project5=5
