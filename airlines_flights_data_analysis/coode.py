import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

dataset = pd.read_csv('airlines_flights_data.csv')
print(dataset.head())

print(dataset.describe())
print(dataset.info())
print(dataset.shape)
print(dataset.isnull().sum())
data1=dataset.drop(columns="index")
print(data1.head())

max_duration=data1[data1["duration"]== 49.830000 ]
print(max_duration)

min_duration=data1[data1["duration"]== 0.830000  ]
print(min_duration)

max_price=data1[data1['price']==123071.000000]
print(max_price)

#Q1 = what are the airline in the dataset ,accompanied by their frequency

min_price=data1[data1['price']== 1105.000000]
print(min_price)

#Q2 showing the names of the airline in the dataset
data1["airline"].nunique()
airline=data1["airline"].unique()
print(airline)

#Q3 showing all the airline with their frequency
frequency=data1["airline"].value_counts()
print(frequency)

#Q4 showing all the airline with their no. of flights in bar graph
freqency1 = data1["airline"].value_counts(ascending=True)
print(freqency1)

freqency1.plot.barh(color=['lightgreen','lightblue'])
plt.title("AIRLINE WITH FRWQUENCY")
plt.xlabel(" Number of flight")
plt.ylabel("airline")
plt.show()

#Q5 showing the departure time for the flights
departure_time=data1["departure_time"].value_counts()
print(departure_time)

#Q6 showing the arrivale time for the flights
arrival_time=data1["arrival_time"].value_counts()
print(arrival_time)

# Showing the departure time and arrival time for the flights with their counts

plt.figure(figsize=(10,6))
plt.subplot(1,2,1)

plt.bar(departure_time.index, departure_time.values)
plt.xticks(rotation=45)
plt.title("Departure Time Counts")
plt.xlabel("Departure Time")
plt.ylabel("Count")

plt.show()

# Showing the departure time and arrival time for the flights with their counts

plt.figure(figsize=(10,6))
plt.subplot(1,2,1)

plt.bar(arrival_time.index, arrival_time.values,color=['r','b'])
plt.xticks(rotation=45)
plt.title("Arrival Time Counts")
plt.xlabel("Arrival Time")
plt.ylabel("Count")

plt.show()

#Q show bar graphs representation the source city and destination city
print(dataset.head())

#showing the source city of the flight

source_city=data1['source_city'].value_counts()
print(source_city)

destination_city=data1['destination_city'].value_counts()
print(destination_city)

plt.figure(figsize=(10,6))
plt.subplot(1,2,1)

plt.barh(source_city.index, source_city.values,color=['g','y'])
plt.xticks(rotation=45)
plt.title("source city Counts")
plt.xlabel("no. of flights")
plt.ylabel("Cities")
plt.tight_layout()

plt.subplot(1,2,2)

plt.barh(destination_city.index, destination_city.values,color=['y','r'])
plt.xticks(rotation=45)
plt.title("destination city Counts")
plt.xlabel("no. of flights")
plt.ylabel("Cities")
plt.tight_layout()

plt.show()

#Q does price varies with airlines?

dataset.head()
ticket_price=data1.groupby('airline')['price'].mean()
print(ticket_price)

sns.catplot(
    x="airline",
    y="price",
    kind="bar",
    palette="rocket",
    hue="class",
    data=data1

)
plt.xticks(rotation=90)
plt.show()

#Q does ticket price change based on the departure time and arrival time
data1.head()

#checking the mean ticket price based on the departure time
data1.groupby("departure_time")["price"].mean()

#checking the mean ticket price based on the departure time
data1.groupby("arrival_time")["price"].mean()

#for grapgh departure_time
sns.catplot(
    x="departure_time",
    y="price",
    kind="bar",
    data=data1

)
plt.xticks(rotation=90)
plt.show()
#for grapgh arrival_time

sns.catplot(
    x="arrival_time",
    y="price",
    kind="bar",
    data=data1

)
plt.xticks(rotation=90)
plt.show()

#for both relational plot
sns.relplot(x='arrival_time',y='price',data=data1,col='departure_time',kind='line')
plt.tight_layout()
plt.show()

#Q how the price changes with change in the source and destination?
data1.head()
#checking the mean ticket price for each source city
data1.groupby("source_city")["price"].mean()
#checking thee mean ticket price for each destination city
data1.groupby('destination_city')['price'].mean()

sns.relplot(x='destination_city',
            y='price',
            kind="line",
            data=data1,
            col='source_city'
)
plt.show()

#Q how is the price affected when ticket are bought in justt 1 or 2 days before departure?
days_left=data1['days_left'].nunique()
print(days_left)

days_left=data1['days_left'].unique()
print(days_left)

days_left1=data1.groupby("days_left")["price"].mean()
print(days_left1)

sns.relplot(x='days_left',y='price',kind="line",data=data1)
plt.tight_layout()
plt.show()

#Q how does the ticket price vary between economy and bussiness class?
diffclass=data1['class'].unique()
print(diffclass)

ecoclass=data1[data1['class']=='Economy']
print(ecoclass)

ecoprice=ecoclass.price
mecoprice=ecoclass.price.mean()
print(mecoprice)
print(ecoprice)

bussinessclass=data1[data1['class']=='Business']
print(bussinessclass)

bussinessprice=bussinessclass.price
mbussinessprice = bussinessprice.mean()
print(mbussinessprice)
print(bussinessprice)

#Q what will be the average price of the vistara airline for a flight from Delhi to hyderabad in bussiness class?

vistaraa = data1[
    (data1['airline'] == 'Vistara') &
    (data1['source_city'] == 'Delhi') &
    (data1['destination_city'] == 'Hyderabad') &
    (data1['class'] == 'Business')
]

print(vistaraa)

meanvista=vistaraa['price'].mean()
print(meanvista)



