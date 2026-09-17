## 7th of September 2026
Today I started building the intial parts of the app. I started by first designing inside a [draw.io](http://draw.io) file the structure of the layers such as controller -> service -> repository -> postgreSQL. Also I made some diagrams for the User and Role model. This gave me a brief idea of what I will build and how it all connects with eachother.

![](obsidian-attachments/Diagram.png)

![](obsidian-attachments/Diagram%20(2).png)

I then installed postgreSQL on my local computer. I installed version 18 which should not be any issue for this simple app. I got recommended version 16 or 17 but eventually downloaded version 18 by mistake and I was to proud to admit a mistake so I just kept going.

Then I built the models User and Role and added JPA annotations to it so it connects with the database at runtime. I started the application and succesfully created two tables inside pgAdmin (the UI for postgreSQL) so the first step of building the backend is officially met. I made sure to keep all sensible credentials inside an .env file that github ignores. 

![Created tables inside pgAdmin](obsidian-attachments/Created%20tables%20inside%20pgAdmin.png)

I have used AI as a mentor for this project. I have set strict rules so that the AI doesn't go bananas and starts taking over the project. It knows to guide me as a mentor and show me the different alternatives I can choose.

So far the project is going good. I have decided not to mention anything on LinkedIn this time because each time I talk about a project on LinkedIn I usually drop it. Evil eye or laziness? We'll see.

Last note. I discovered the Project Board on Github where I can set up all the objectives and tasks I need to work on. Amazing tool to keep track of the tasks. I then had a crazy idea to connect Cursor to that project board. Cursor already has access to my Github but could it connect to my project board and access the tasks and upload new tasks? Turns out it can. I think this will be very useful for the project and keep the flow of work very smoothly.

![Project Board on Github](obsidian-attachments/Project%20Board%20on%20Github.png)

![How it looks inside a task](obsidian-attachments/How%20it%20looks%20inside%20a%20task.png)

![How it looks inside a task (2)](obsidian-attachments/How%20it%20looks%20inside%20a%20task%20(2).png)

# 9th of September 2026 
##### 9:52
Today we keep going. Last coding session I made the first connection between the Java application and my local postgreSQL server. It connected succesfully. Today I will focus on making the repository level. I had three layers in mind. Controller -> Service -> Repository. After today's session I hope to be done with the Repository level and be able to create a user and save in my local database. Now the user-creation logic will not be written on the repository level, this will be done in the service level. But I will probably write a temporary code on the repository level to see if it works first. 

![](obsidian-attachments/Project%20Board%20on%20Github%20with%20todays%20task.png)

#### 11:47
So right now I am planning, will I make one table row for users and one separate row for roles and then match them with a foreign key like role_id? Or should I make one user table with the role embedded in the table like "COACH" or "PLAYER"? It seems that making two separate roles is the most scalable option. It might be overkill for this project but you never know where a project lands. So let's make it scalable. 

So what makes it scalable? The idea is that by having a set of roles inside an own table I can make the following: 
	1 - Limit the amount of allowed roles so that no "fake" role gets stored by accident. 
	2 - Add permissions on top of the role instead of writing it within each user. Meaning instead of writing it inside the user like "read_parents_phone" and have to repeat that for every user with that permission - we can just add it onto the role itself and it just repeats once. For this small project with 4 roles it might not make the biggest impact in terms of speed and memory but I would like to build something that can expand. 
	3 - If I later decide to expand the application I can make other tables that point towards the role table, if I want to add new functionalities etc. 

#### 12:32 
One idea that I am discussing in my head now is if I should have a separate table for permissions. For example, READ_PARENTS_PHONE or READ_PLAYER_ADRESS, and then give each permission an ID that the role can point to. So COACH has permission 1,2,3 etc and it points to a set of permissions in another table. 
![](obsidian-attachments/Roles%20and%20permissions.png)

I have added it onto the project board. 
![](obsidian-attachments/Added%20permission%20table%20on%20project%20board.png)

#### 13:23
I have now connected JPA to the local postgreSQL server on my computer. 
![](obsidian-attachments/Image%20of%20RoleRepository%20code.png)

Both for the User repository and the Role repository.

![](obsidian-attachments/Image%20of%20userRepository%20Code.png)

#### 19:52
Last log for today. I have now finished the Repository layer and the Service layer. They are of course not 100% done, there is a lot of security left to work on the service layer but enough to now build a controller layer and test my API from Postman. 
![](obsidian-attachments/UserService.png)

I also made a RoleSeeder to push in data straight into the database upon start to see if the data was passing through correctly. Images show success. 
![](obsidian-attachments/Pasted%20image%2020260909200035.png)
This is the code that runs whenever the API is started
![](obsidian-attachments/Pasted%20image%2020260909200126.png)
And this is the data inside the database that made it through. Next step is making a controller layer where we will create an user from it. 

### 13th of September 2026
####  13:45 
Today I made the controller layer. Very basic structure but managed to create an user through Postman.

![](obsidian-attachments/Pasted%20image%2020260913134657.png)

And when we look into PostgreSQL we see that the user is indeed stored in the database. 

![](obsidian-attachments/Pasted%20image%2020260913134749.png)

So this is a big first success. I made sure to use a DTO to transfer data between the controller layer and the service layer. At the moment there is no sensible data to protect but it will be added later on so it's good to set the foundation. 

![](obsidian-attachments/Pasted%20image%2020260913135008.png)

### 15th of September 2026
#### 15:06 
Today I am working on adding some more endpoints to the controller layer. It's currently missing a PUT endpoint to change the user role so that we can change someone from PLAYER to COACH for example. At the beginning everyone will be able to make this call, later on I will add some security on top it so only COACH and ADMIN can make these role changes. 

#### 16:09
The more I am coding in Cursor the more I see that not every suggestion I get from AI is the right suggestion. When making the endpoint to change the user's role I got the suggestion from AI to use the same DTO that I use when creating an user. Meaning that whenever I update the user's role I will get back their ID, their name, their email and whatever extra data I add later on. I decided to show Cursor who is in command and decided to make a separate DTO for changing roles. That way whenever we update the user role we only get back from the database the user id and the new role to confirm the change. I think that's way cleaner. 

![](obsidian-attachments/Pasted%20image%2020260915162515.png)

This is my controller logic for updating the user role. It now uses a separate DTO so that we don't send more data than what's needed. I think using the same DTO for different purposes just messes the structure and I prefer to have more classes with individual purposes. Even if they have the same data inside I think I would still make separate classes just in case I want to change something in it later. 

#### Testing changing the user role 
#### 20:15 

![](obsidian-attachments/Pasted%20image%2020260915190131.png)

In the image above is the user saved in the local database. The role id is 2 which points to COACH in another table.  As seen in the image below. 
![](obsidian-attachments/Pasted%20image%2020260915190248.png)

Now I will make a PUT request to the API using Postman and send the new role in a String format. 

![](obsidian-attachments/Pasted%20image%2020260915190721.png)

This is the response I got. A full 200 OK and I got the user ID returned back as well as the new role thanks to the DTO I made earlier specific for this API call. 
![](obsidian-attachments/Pasted%20image%2020260915191337.png)

The response shows PLAYER instead of COACH now. That means that if I make a GET request for this user I should receive PLAYER as their role as well. 

![](obsidian-attachments/Pasted%20image%2020260915194404.png)

Which turned out to be correct. That means also that If I search up the user inside my local database I should see the user have a role id of 3 instead of 2. 

![](obsidian-attachments/Pasted%20image%2020260915194511.png)

Works like a charm. So far so good. I still haven't tested too see what happens when I send an invalid role. Let's see what happens if I send ARTIST for example. 
![](obsidian-attachments/Pasted%20image%2020260915200835.png)

I got a 500 server error. That's good. It means that some security is applied. I still haven't made any error exceptions yet so that's why I am getting a standard 500 internal server error. Later on when I fix the exceptions it should throw a 400 bad request error. That reminds me also that I should make createUser return status 201 which stands for CREATED instead of just returning 200 OK.  I have added this now as a TODO list inside the code. 
![](obsidian-attachments/Pasted%20image%2020260915201518.png)

Here is a showcase of all our API endpoints we can call right now from our controller. 
![](obsidian-attachments/Pasted%20image%2020260915210706.png)

And here is an image that shows how to practically use them.
![](obsidian-attachments/Pasted%20image%2020260915210916.png)

#### 9:15
Right now I am battling a new question that I hadn't thought about. What if a coach wants to remove a player from the club? Then we just make a simple deleteUser like any CRUD application right? But what if the club in the future needs to have a log of the players that were active last year? Or they temporarily inactivate a player because misbehavior and then lets him join again, or what if a player is permanently banned from the club and the player tries to rejoin again after a couple of years and the club needs a way to see if this user has been in the club previously?. 

That means that we need a table of inactive users and we need to store their data for a longer period. I am not sure how long I can save their personal data on our database according to GDPR. I would have to look that up. 

Then there is another issue linked to that. Every player is linked to a parent or two parents. If a player gets inactivated - should his parents also get inactivated automatically? What if a parent has more than one child in the club? Then we need to have a code that checks if the inactive player has a parent with more players attributed to it, if there are no more players then the parent gets automatically inactivated together with the player. If there are more players attributed to the same parent then only the player gets inactivated. This sounds like it's too early to build right now so I will therefore skip deleteUser for now. 

#### 22:00
After some discussion with Grok I got a good suggestion. Instead of having a separate table of inactive users I can just have an attribute called active and then just have a boolean true or false on it. That way we skip having double data in the database and we skip having issues with messy joins. But this will probably be for another version of the app. Not now. 

![](obsidian-attachments/Pasted%20image%2020260915222619.png)
I have updated CreateUser to return a DTO instead of the actual AppUser. Now when creating an user instead of returning the role ID it's returning the role in String format. As seen below. 
![](obsidian-attachments/Pasted%20image%2020260915222728.png)

### 17th of September 2026
#### 13:25 
Last session I started noticing something. The idea of what the project should be started to blur out in my mind. I started forgetting what I needed to prioritize and what I needed to ignore. Luckily I have made this mistake a dozen times. Previously I have just kept going and ended up with spaghetti code with no clear idea of what to do. This time I caught myself. The issue I had is that in the beginning of the project I made an idea of what version 1 of this app should look like. While coding along I started to forget this and started bringing new ideas and started to drift away from the plan. 

So I realized that I need to change how I work and plan. I have decided to start working Agile in Jira to keep track of the work and plan ahead. Agile framework and SCRUM is a framework that I am currently studying in school and I honestly really liked it. I am even considering applying for jobs as project leaders / scrum masters. So I will apply it to this project. The only issue is that I am working solo and I have no team. But I asked my teacher about it and she said that it's no issue, you just have to take away some of the daily routines that would otherwise be part of the scrum if you are in a team such as daily scrum meetings. 

I have created an account in Jira now. I tried to connect Jira to Cursor so that Cursor can fetch my user stories and tasks and then discuss with me. However I think that Jira has a paid plan if you want to connect it to AI. And I am... well, not rich yet so I will use Jira manually. No I am not poor. I just have a household with high economic metabolism. 

![](Pasted%20image%2020260917133424.png)