confReserve
===========


<a href="https://github.com/demakoff/confReserve/blob/master/app.js">app.js</a> - server side index-file.<br/>
<a href="https://github.com/demakoff/confReserve/blob/master/public/index.html">public/index.html</a> - client-side index-file.

Service is based on REST principles and maintain next client-requests:

<b><u>1. Authorization</u></b>

<b>Request:</b> POST /login 	(body: {"uid":"useruid", "password":"userpassword"})
<b>Response:</b> if successful: 200, OK
		if failed: error.code, error.message

<b><u>2. Get all reservations</u></b>

<b>Request:</b> GET /reservations
<b>Response:</b> if successful: JSON in the next format 
  {
	"roomId": roomId,
	"date": startdate,
	"userId": userUid,
	"endDate": endDate    
  }
		if failed: error.code, error.message

<b><u>3. Create new reservation</u></b>

<b>Request:</b> POST /reservations 	(body: 
{
	"roomId": roomId,
	"date": startdate,	
	"endDate": endDate    
})
<b>Response:</b> if successful: 200, OK
		if failed: error.code, error.message

<b><u>4. Remove reservation</u></b>

<b>Request:</b> DELETE /reservations 	(body: 
{
	"roomId": roomId,
	"date": startdate
})
<b>Response:</b> if successful: 200, OK
		if failed: error.code, error.message